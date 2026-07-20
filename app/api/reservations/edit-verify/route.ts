import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/otp";
import { signToken } from "@/lib/session";

/**
 * POST /api/reservations/edit-verify { reservationNo, phone }
 * 예약번호(8자리) + 현재 등록된 휴대폰 번호가 일치하면
 * 10분짜리 수정 토큰(editToken)과 현재 예약 정보를 반환.
 * - 취소/환불 예약은 수정 불가
 * - 무차별 대입 방지: 실패 응답은 원인을 구분하지 않고 동일 문구
 */
export async function POST(req: Request) {
  try {
    const { reservationNo, phone: rawPhone } = await req.json();
    const no = String(reservationNo || "").trim().toUpperCase();
    const phone = normalizePhone(rawPhone);

    if (!/^[0-9A-F]{8}$/.test(no) || !phone) {
      return NextResponse.json(
        { error: "예약번호 8자리와 휴대폰 번호를 확인해 주세요." },
        { status: 400 }
      );
    }

    const sb = createAdminSupabase();

    // 예약번호는 UUID 앞 8자리 — 기존 관리자 검색과 동일한 범위 매칭 방식
    const lower = no.toLowerCase();
    const { data: candidates, error } = await sb
      .from("reservations")
      .select(
        "id, status, customer_name, customer_phone, product:products(title), departure:departures(departure_date)"
      )
      .gte("id", `${lower}00000000-0000-0000-0000-000000000000`.slice(0, 36))
      .lte("id", `${lower}ffffffff-ffff-ffff-ffff-ffffffffffff`.slice(0, 36))
      .limit(5);
    if (error) throw error;

    const match = (candidates ?? []).find(
      (r) =>
        r.id.slice(0, 8).toLowerCase() === lower &&
        String(r.customer_phone).replace(/\D/g, "") === phone
    );

    if (!match) {
      // 존재 여부를 노출하지 않는 동일 실패 응답
      return NextResponse.json(
        { error: "예약 정보를 찾을 수 없습니다. 예약번호와 휴대폰 번호를 다시 확인해 주세요." },
        { status: 404 }
      );
    }

    if (["canceled", "refunded"].includes(match.status)) {
      return NextResponse.json(
        { error: "취소/환불된 예약은 수정할 수 없습니다. 고객센터로 문의해 주세요." },
        { status: 400 }
      );
    }

    // 10분짜리 수정 토큰 (예약 id 고정 → 다른 예약 수정 불가)
    const editToken = await signToken(
      { t: "resv_edit", rid: match.id, phone },
      600
    );

    return NextResponse.json({
      editToken,
      reservation: {
        no,
        customer_name: match.customer_name,
        customer_phone: match.customer_phone,
        product_title: (match.product as any)?.title ?? "-",
        departure_date: (match.departure as any)?.departure_date ?? null,
      },
    });
  } catch (e) {
    console.error("[reservations/edit-verify]", e);
    return NextResponse.json(
      { error: "확인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
