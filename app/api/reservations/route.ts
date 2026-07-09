import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

/**
 * POST /api/reservations — pending 예약 생성
 *
 * 대전빵버스에서 검증한 "pending reservation" 패턴:
 * 1) 결제 전에 DB에 예약 레코드를 먼저 생성
 * 2) 예약 UUID를 나이스페이 orderId(Moid)로 사용
 * 3) 결제 return에서 UUID로 저장된 데이터를 조회 (PG 파라미터에 의존하지 않음)
 *
 * 금액은 클라이언트 값을 신뢰하지 않고 DB 가격 기준으로 서버에서 재계산.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      departure_id,
      boarding_point_id,
      customer_name,
      customer_phone,
      adult_count = 0,
      child_count = 0,
      infant_count = 0,
      request_memo,
      payment_method,
    } = body;

    if (!departure_id || !customer_name || !customer_phone) {
      return NextResponse.json({ error: "필수 정보가 누락되었습니다." }, { status: 400 });
    }
    if (adult_count < 1) {
      return NextResponse.json({ error: "성인 1명 이상 선택해 주세요." }, { status: 400 });
    }

    const sb = createAdminSupabase();

    // 출발일 + 상품 가격 조회
    const { data: dep, error: depErr } = await sb
      .from("departures")
      .select("*, product:products(id, title, base_price, child_price, infant_price, duration_text)")
      .eq("id", departure_id)
      .maybeSingle();
    if (depErr) throw depErr;
    if (!dep || !dep.product) {
      return NextResponse.json({ error: "출발일 정보를 찾을 수 없습니다." }, { status: 404 });
    }
    if (dep.status !== "open") {
      return NextResponse.json({ error: "예약이 마감된 출발일입니다." }, { status: 409 });
    }

    const totalPeople = adult_count + child_count + infant_count;
    const remaining = dep.total_seats - dep.reserved_seats;
    if (totalPeople > remaining) {
      return NextResponse.json(
        { error: `잔여 좌석이 ${Math.max(remaining, 0)}석입니다.` },
        { status: 409 }
      );
    }

    // 서버측 금액 계산 (departure 개별가 > 상품 기본가 순)
    const p = dep.product;
    const adultPrice = dep.adult_price ?? p.base_price;
    const childPrice = dep.child_price ?? p.child_price ?? p.base_price;
    const infantPrice = dep.infant_price ?? p.infant_price ?? 0;
    const total =
      adult_count * adultPrice + child_count * childPrice + infant_count * infantPrice;

    const { data: reservation, error: insErr } = await sb
      .from("reservations")
      .insert({
        product_id: p.id,
        departure_id,
        boarding_point_id: boarding_point_id || null,
        customer_name,
        customer_phone,
        adult_count,
        child_count,
        infant_count,
        total_amount: total,
        status: "pending",
        payment_method: payment_method === "bank" ? "bank" : "card",
        request_memo: request_memo || null,
      })
      .select("id")
      .single();
    if (insErr) throw insErr;

    // GoodsName에 출발일 포함 (SMS/관리에서 날짜 식별 용이 — 빵버스 교훈)
    const goodsName = `${p.title} (${dep.departure_date})`.slice(0, 40);

    return NextResponse.json({
      id: reservation.id,
      amount: total,
      goodsName,
      clientId: process.env.NICEPAY_CLIENT_ID ?? "",
    });
  } catch (e: any) {
    console.error("[reservations POST]", e);
    return NextResponse.json({ error: "예약 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
