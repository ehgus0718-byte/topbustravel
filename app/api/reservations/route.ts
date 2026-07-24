import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { NICEPAY_MID, getEdiDate, buildAuthSign } from "@/lib/nicepay";
import { getSessionUser } from "@/lib/session";

/**
 * POST /api/reservations — pending 예약 생성 + 나이스페이 구모듈 결제창 파라미터 응답
 *
 * 로그인 필수: 프론트(예약 페이지)에서도 막지만, 여기서도 세션을 검증해
 * API를 직접 호출하는 우회 결제 시도를 차단한다.
 *
 * 대전빵버스에서 검증한 "pending reservation" 패턴:
 * 1) 결제 전에 DB에 예약 레코드를 먼저 생성
 * 2) 예약 UUID를 나이스페이 Moid로 사용
 * 3) 결제 return에서 UUID로 저장된 데이터를 조회 (PG 파라미터에 의존하지 않음)
 *
 * 금액은 클라이언트 값을 신뢰하지 않고 DB 가격 기준으로 서버에서 재계산.
 * SignData(sha256(EdiDate+MID+Amt+상점키))는 상점키가 필요하므로 반드시 서버에서 생성.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "로그인 후 예약할 수 있습니다." }, { status: 401 });
  }

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

    // 로그인 회원이면 회원 고유번호를 함께 저장한다.
    // (전화번호만으로 매칭하면 번호 변경 시 과거 예약이 마이페이지에서 사라짐)
    const { data: reservation, error: insErr } = await sb
      .from("reservations")
      .insert({
        product_id: p.id,
        departure_id,
        boarding_point_id: boarding_point_id || null,
        user_uid: user?.uid ?? null,
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

    // 무통장이면 결제 파라미터 불필요
    if (payment_method === "bank") {
      return NextResponse.json({ id: reservation.id, amount: total, goodsName });
    }

    // ── 나이스페이 구모듈 결제창 파라미터 (서명은 서버에서만 생성) ──
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://topbustravel.com";
    const amt = String(total);
    const ediDate = getEdiDate();

    return NextResponse.json({
      id: reservation.id,
      amount: total,
      goodsName,
      // 결제창 폼 필드
      mid: NICEPAY_MID,
      amt,
      ediDate,
      signData: buildAuthSign(ediDate, amt),
      returnUrl: `${siteUrl}/api/payments/return`,
    });
  } catch (e: any) {
    console.error("[reservations POST]", e);
    return NextResponse.json({ error: "예약 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
