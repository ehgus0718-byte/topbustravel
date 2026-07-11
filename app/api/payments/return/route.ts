import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/sms/solapi";

/**
 * POST /api/payments/return — 나이스페이 JS SDK v2 returnUrl
 *
 * 흐름:
 * 1) 나이스페이가 인증 결과를 form POST로 전달 (authResultCode, tid, orderId, amount)
 * 2) orderId(= 예약 UUID)로 pending 예약을 "원자적으로 선점" (중복 콜백/더블클릭 방어)
 * 3) 금액 위변조 검증 (예약 금액 vs 인증 금액)
 * 4) 승인 API 호출 (POST /v1/payments/{tid}) 후 승인 응답 금액 재검증
 * 5) 성공 시 status=paid + 좌석 차감 + 확정 SMS, 실패 시 failed 페이지로
 *
 * 상태 전이: pending → processing → paid | failed
 *   - processing에서 멈춘 예약 = 승인 도중 서버 오류. 로그의 tid로 나이스페이
 *     상점관리자에서 수동 확인 후 처리 (아래 CRITICAL 로그 참조)
 */

const NICEPAY_API_BASE =
  process.env.NICEPAY_API_BASE || "https://api.nicepay.co.kr"; // 샌드박스: https://sandbox-api.nicepay.co.kr

function redirectTo(origin: string, path: string) {
  // 나이스페이 POST 후 브라우저를 GET으로 이동시키기 위해 303 사용
  return NextResponse.redirect(new URL(path, origin), 303);
}

export async function POST(req: Request) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const fail = (msg: string) =>
    redirectTo(origin, `/reservation/failed?msg=${encodeURIComponent(msg)}`);

  try {
    const form = await req.formData();
    const authResultCode = String(form.get("authResultCode") ?? "");
    const authResultMsg = String(form.get("authResultMsg") ?? "");
    const tid = String(form.get("tid") ?? "");
    const orderId = String(form.get("orderId") ?? "");
    const amount = Number(form.get("amount") ?? 0);

    if (!orderId) return fail("주문 정보가 없습니다.");

    const sb = createAdminSupabase();

    // ── 1) 예약 조회 (선점 전 현재 상태 파악) ─────────────────────────
    const { data: reservation, error } = await sb
      .from("reservations")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();
    if (error) throw error;
    if (!reservation) return fail("예약 정보를 찾을 수 없습니다.");

    // 이미 처리된 예약이면 완료 페이지로 (중복 콜백 방어 1차)
    if (reservation.status === "paid" || reservation.status === "confirmed") {
      return redirectTo(origin, `/reservation/complete?id=${orderId}`);
    }

    // ── 2) 인증 실패 처리 ────────────────────────────────────────────
    if (authResultCode !== "0000") {
      await sb
        .from("reservations")
        .update({ status: "failed", fail_reason: authResultMsg || authResultCode })
        .eq("id", orderId)
        .eq("status", "pending");
      return fail(authResultMsg || "결제 인증에 실패했습니다.");
    }

    // ── 3) 금액 위변조 검증 (form 값 vs DB) ──────────────────────────
    if (amount !== reservation.total_amount) {
      console.error("[payments/return] amount mismatch", {
        orderId,
        expected: reservation.total_amount,
        got: amount,
      });
      return fail("결제 금액이 일치하지 않습니다.");
    }

    // ── 4) 원자적 선점: pending → processing ─────────────────────────
    // 동시 콜백이 와도 조건부 UPDATE는 한 쪽만 성공하므로 승인 API가 두 번 호출되지 않음
    const { data: claimed, error: claimErr } = await sb
      .from("reservations")
      .update({ status: "processing" })
      .eq("id", orderId)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (claimErr) throw claimErr;
    if (!claimed) {
      // 다른 요청이 먼저 선점함 → 잠시 후 완료 페이지에서 결과 확인
      return redirectTo(origin, `/reservation/complete?id=${orderId}`);
    }

    // ── 5) 승인 API 호출 ─────────────────────────────────────────────
    const clientId = process.env.NICEPAY_CLIENT_ID || "";
    const secretKey = process.env.NICEPAY_SECRET_KEY || "";
    const basicAuth = Buffer.from(`${clientId}:${secretKey}`).toString("base64");

    const approveRes = await fetch(`${NICEPAY_API_BASE}/v1/payments/${tid}`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount }),
    });
    const approve = await approveRes.json();

    if (approve.resultCode !== "0000") {
      console.error("[payments/return] approve failed", { orderId, tid, approve });
      await sb
        .from("reservations")
        .update({ status: "failed", fail_reason: approve.resultMsg || approve.resultCode })
        .eq("id", orderId)
        .eq("status", "processing");
      return fail(approve.resultMsg || "결제 승인에 실패했습니다.");
    }

    // 승인 응답 금액 재검증 (form 값은 위변조 가능하므로 승인 결과 기준으로 한 번 더)
    if (Number(approve.amount) !== reservation.total_amount) {
      console.error("[payments/return] CRITICAL approve amount mismatch — 취소 필요", {
        orderId,
        tid,
        expected: reservation.total_amount,
        approved: approve.amount,
      });
      // 승인은 됐지만 금액이 다름 → 즉시 취소 시도
      await fetch(`${NICEPAY_API_BASE}/v1/payments/${tid}/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: "amount mismatch",
          orderId,
        }),
      }).catch((e) =>
        console.error("[payments/return] CRITICAL cancel failed — 수동 취소 필요", { tid, e })
      );
      await sb
        .from("reservations")
        .update({ status: "failed", fail_reason: "approve amount mismatch" })
        .eq("id", orderId);
      return fail("결제 금액 검증에 실패하여 결제가 취소되었습니다.");
    }

    // ── 6) 예약 확정 ─────────────────────────────────────────────────
    // 돈은 이미 빠진 시점이므로, 여기서 실패하면 CRITICAL 로그(tid 포함)로 수동 복구 근거를 남긴다
    const { error: updateErr } = await sb
      .from("reservations")
      .update({
        status: "paid",
        payment_method: "card",
        payment_tid: tid,
        paid_at: new Date().toISOString(),
      })
      .eq("id", orderId);
    if (updateErr) {
      console.error(
        "[payments/return] CRITICAL 승인 완료됐으나 DB 업데이트 실패 — 수동 복구 필요",
        { orderId, tid, updateErr }
      );
      // 사용자에게는 완료로 안내 (결제는 정상 승인됨). 운영자가 로그 보고 status 수동 갱신.
      return redirectTo(origin, `/reservation/complete?id=${orderId}`);
    }

    // ── 7) 좌석 차감 ─────────────────────────────────────────────────
    if (reservation.departure_id) {
      const seats =
        reservation.adult_count + reservation.child_count + reservation.infant_count;
      const { error: seatErr } = await sb.rpc("increment_reserved_seats", {
        dep_id: reservation.departure_id,
        cnt: seats,
      });
      if (seatErr) {
        console.error("[payments/return] seat increment failed — 수동 보정 필요", {
          orderId,
          seatErr,
        });
      }
    }

    // ── 8) 예약 확정 SMS (실패해도 결제 흐름은 성공 처리) ─────────────
    // ⚠️ 컬럼명 확인: reservation.name / reservation.phone 이 실제 스키마와 다르면 수정
    if (reservation.phone) {
      const smsText = [
        `[topBustravel] 예약이 확정되었습니다.`,
        reservation.name ? `예약자: ${reservation.name}` : null,
        `결제금액: ${reservation.total_amount.toLocaleString()}원`,
        `예약번호: ${String(orderId).slice(0, 8).toUpperCase()}`,
        `문의: 소망투어`,
      ]
        .filter(Boolean)
        .join("\n");

      const smsResult = await sendSms(reservation.phone, smsText);
      if (!smsResult.ok) {
        console.error("[payments/return] SMS 발송 실패", { orderId, smsResult });
      }
    }

    return redirectTo(origin, `/reservation/complete?id=${orderId}`);
  } catch (e) {
    console.error("[payments/return]", e);
    return fail("결제 처리 중 오류가 발생했습니다.");
  }
}

// 사용자가 브라우저로 직접 접근한 경우
export async function GET(req: Request) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  return redirectTo(origin, "/");
}
