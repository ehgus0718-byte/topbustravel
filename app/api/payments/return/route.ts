import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/sms/solapi";
import { NICEPAY_MID, getEdiDate, buildApproveSign, buildFormBody } from "@/lib/nicepay";

/**
 * POST /api/payments/return — 나이스페이 구모듈(웹표준 결제창) ReturnURL
 *
 * 흐름 (대전빵버스 nicepay-return v17 이식):
 * 1) 결제창 인증 결과가 form POST로 전달
 *    (AuthResultCode, AuthToken, TxTid, Amt, NextAppURL, NetCancelURL, Moid)
 * 2) Moid(= 예약 UUID)로 pending 예약을 원자적으로 선점 (중복 콜백 방어)
 * 3) 금액 위변조 검증 (예약 금액 vs 인증 금액)
 * 4) NextAppURL로 승인 요청 — SignData = sha256(AuthToken+MID+Amt+EdiDate+상점키)
 *    승인 성공 코드: CARD=3001, BANK=4000, VBANK=4100
 *    승인 통신 실패 시 NetCancelURL로 망취소
 * 5) 성공 시 status=paid + 좌석 차감 + 확정 SMS, 실패 시 failed 페이지로
 *
 * 상태 전이: pending → processing → paid | failed
 */

function redirectTo(origin: string, path: string) {
  // 나이스페이 POST 후 브라우저를 GET으로 이동시키기 위해 303 사용
  return NextResponse.redirect(new URL(path, origin), 303);
}

const SUCCESS_CODES: Record<string, string> = {
  CARD: "3001",
  BANK: "4000",
  VBANK: "4100",
};

export async function POST(req: Request) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const fail = (msg: string) =>
    redirectTo(origin, `/reservation/failed?msg=${encodeURIComponent(msg)}`);

  try {
    // 구모듈은 euc-kr 인코딩 폼을 보낼 수 있어 formData() 대신 raw 파싱
    const rawText = await req.text();
    const params: Record<string, string> = {};
    new URLSearchParams(rawText).forEach((v, k) => {
      params[k] = v;
    });

    const authResultCode = params["AuthResultCode"] || "";
    const authResultMsg = params["AuthResultMsg"] || "";
    const authToken = params["AuthToken"] || "";
    const txTid = params["TxTid"] || "";
    const amt = params["Amt"] || "";
    const nextAppURL = params["NextAppURL"] || "";
    const netCancelURL = params["NetCancelURL"] || "";
    const orderId = params["Moid"] || "";
    const payMethod = (params["PayMethod"] || "CARD").toUpperCase();

    if (!orderId) return fail("주문 정보가 없습니다.");

    const sb = createAdminSupabase();

    // ── 1) 예약 조회 ─────────────────────────────────────────────────
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

    // ── 3) 금액 위변조 검증 (인증 Amt vs DB) ─────────────────────────
    if (Number(amt) !== reservation.total_amount) {
      console.error("[payments/return] amount mismatch", {
        orderId,
        expected: reservation.total_amount,
        got: amt,
      });
      return fail("결제 금액이 일치하지 않습니다.");
    }

    // ── 4) 원자적 선점: pending → processing ─────────────────────────
    const { data: claimed, error: claimErr } = await sb
      .from("reservations")
      .update({ status: "processing" })
      .eq("id", orderId)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (claimErr) throw claimErr;
    if (!claimed) {
      return redirectTo(origin, `/reservation/complete?id=${orderId}`);
    }

    // ── 5) 승인 요청 (NextAppURL) — 빵버스 v17 검증 로직 ─────────────
    const ediDate = getEdiDate();
    const approveParams = {
      TID: txTid,
      AuthToken: authToken,
      MID: NICEPAY_MID,
      Amt: amt,
      EdiDate: ediDate,
      SignData: buildApproveSign(authToken, amt, ediDate),
      CharSet: "utf-8",
      EdiType: "JSON",
    };

    let approve: Record<string, unknown>;
    try {
      const r = await fetch(nextAppURL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded; charset=euc-kr" },
        body: buildFormBody(approveParams),
        signal: AbortSignal.timeout(10000),
      });
      approve = JSON.parse(await r.text());
    } catch (e) {
      // 승인 통신 실패 → 망취소 시도 (승인 여부 불명 상태 방지 — 빵버스 교훈)
      console.error("[payments/return] approve 통신 실패 — 망취소 시도", { orderId, txTid, e });
      try {
        await fetch(netCancelURL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded; charset=euc-kr" },
          body: buildFormBody({ ...approveParams, NetCancel: "1" }),
          signal: AbortSignal.timeout(5000),
        });
      } catch (ce) {
        console.error("[payments/return] CRITICAL 망취소도 실패 — 나이스페이 확인 필요", {
          orderId,
          txTid,
          ce,
        });
      }
      await sb
        .from("reservations")
        .update({ status: "failed", fail_reason: "approve network error" })
        .eq("id", orderId)
        .eq("status", "processing");
      return fail("결제 승인 중 오류가 발생했습니다. 다시 시도해 주세요.");
    }

    const resultCode = String(approve.ResultCode || "");
    const isSuccess = resultCode === (SUCCESS_CODES[payMethod] || "3001");

    if (!isSuccess) {
      console.error("[payments/return] approve failed", { orderId, txTid, approve });
      await sb
        .from("reservations")
        .update({
          status: "failed",
          fail_reason: `${approve.ResultMsg || ""} (${resultCode})`.trim(),
        })
        .eq("id", orderId)
        .eq("status", "processing");
      return fail(String(approve.ResultMsg || "결제 승인에 실패했습니다."));
    }

    const approvedAmt = Number(approve.Amt || amt);
    const tid = String(approve.TID || txTid);

    // 승인 금액 재검증 — 불일치 시 CRITICAL 로그 (구모듈 취소는 상점관리자에서 수동)
    if (approvedAmt !== reservation.total_amount) {
      console.error("[payments/return] CRITICAL 승인 금액 불일치 — 상점관리자에서 취소 필요", {
        orderId,
        tid,
        expected: reservation.total_amount,
        approved: approvedAmt,
      });
      await sb
        .from("reservations")
        .update({ status: "failed", fail_reason: `approve amount mismatch TID:${tid}` })
        .eq("id", orderId);
      return fail("결제 금액 검증에 실패했습니다. 고객센터로 문의해 주세요.");
    }

    // ── 6) 예약 확정 ─────────────────────────────────────────────────
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
    if (reservation.customer_phone) {
      let productTitle: string | null = null;
      let departureDate: string | null = null;
      try {
        if (reservation.product_id) {
          const { data: product } = await sb
            .from("products")
            .select("title")
            .eq("id", reservation.product_id)
            .maybeSingle();
          productTitle = product?.title ?? null;
        }
        if (reservation.departure_id) {
          const { data: departure } = await sb
            .from("departures")
            .select("departure_date")
            .eq("id", reservation.departure_id)
            .maybeSingle();
          departureDate = departure?.departure_date ?? null;
        }
      } catch (e) {
        console.error("[payments/return] SMS용 상품/출발일 조회 실패", { orderId, e });
      }

      const people = [
        reservation.adult_count > 0 ? `성인${reservation.adult_count}` : null,
        reservation.child_count > 0 ? `아동${reservation.child_count}` : null,
        reservation.infant_count > 0 ? `유아${reservation.infant_count}` : null,
      ]
        .filter(Boolean)
        .join(" ");

      const smsText = [
        `[topBustravel] 예약이 확정되었습니다.`,
        productTitle ? `상품: ${productTitle}` : null,
        departureDate ? `출발일: ${departureDate}` : null,
        people ? `인원: ${people}` : null,
        reservation.customer_name ? `예약자: ${reservation.customer_name}` : null,
        `결제금액: ${reservation.total_amount.toLocaleString()}원`,
        `예약번호: ${String(orderId).slice(0, 8).toUpperCase()}`,
        `문의: 소망투어`,
      ]
        .filter(Boolean)
        .join("\n");

      const smsResult = await sendSms(reservation.customer_phone, smsText);
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
