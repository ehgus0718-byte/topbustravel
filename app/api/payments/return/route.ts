import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

/**
 * POST /api/payments/return — 나이스페이 JS SDK v2 returnUrl
 *
 * 흐름:
 * 1) 나이스페이가 인증 결과를 form POST로 전달 (authResultCode, tid, orderId, amount)
 * 2) orderId(= 예약 UUID)로 pending 예약 조회
 * 3) 금액 위변조 검증 (예약 금액 vs 결제 금액) — 빵버스에서 배운 교훈
 * 4) 승인 API 호출 (POST /v1/payments/{tid})
 * 5) 성공 시 예약 status=paid + 좌석 차감, 실패 시 failed 페이지로
 */

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
    const { data: reservation, error } = await sb
      .from("reservations")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();
    if (error) throw error;
    if (!reservation) return fail("예약 정보를 찾을 수 없습니다.");

    // 이미 처리된 예약이면 완료 페이지로 (중복 콜백 방어)
    if (reservation.status === "paid" || reservation.status === "confirmed") {
      return redirectTo(origin, `/reservation/complete?id=${orderId}`);
    }

    if (authResultCode !== "0000") {
      return fail(authResultMsg || "결제 인증에 실패했습니다.");
    }

    // 금액 위변조 검증
    if (amount !== reservation.total_amount) {
      console.error("[payments/return] amount mismatch", {
        orderId,
        expected: reservation.total_amount,
        got: amount,
      });
      return fail("결제 금액이 일치하지 않습니다.");
    }

    // 승인 API 호출
    const clientId = process.env.NICEPAY_CLIENT_ID || "";
    const secretKey = process.env.NICEPAY_SECRET_KEY || "";
    const basicAuth = Buffer.from(`${clientId}:${secretKey}`).toString("base64");

    const approveRes = await fetch(`https://api.nicepay.co.kr/v1/payments/${tid}`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount }),
    });
    const approve = await approveRes.json();

    if (approve.resultCode !== "0000") {
      console.error("[payments/return] approve failed", approve);
      return fail(approve.resultMsg || "결제 승인에 실패했습니다.");
    }

    // 예약 확정 + 좌석 차감
    await sb
      .from("reservations")
      .update({
        status: "paid",
        payment_method: "card",
        payment_tid: tid,
        paid_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (reservation.departure_id) {
      const seats =
        reservation.adult_count + reservation.child_count + reservation.infant_count;
      await sb.rpc("increment_reserved_seats", {
        dep_id: reservation.departure_id,
        cnt: seats,
      });
    }

    // TODO: 예약 확정 SMS 발송 — 빵버스 send-reservation-status-sms 로직 이식 지점
    // await sendReservationSms(reservation, ...);

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
