import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

// POST /api/reservations/lookup — 이름+휴대폰 번호로 본인 예약 조회
export async function POST(req: Request) {
  try {
    const { name, phone } = await req.json();
    if (!name || !phone) {
      return NextResponse.json({ error: "이름과 연락처를 입력해 주세요." }, { status: 400 });
    }

    const digits = String(phone).replace(/\D/g, "");
    const sb = createAdminSupabase();

    // 하이픈 유무 관계없이 조회
    const { data, error } = await sb
      .from("reservations")
      .select(
        "id, status, total_amount, created_at, product:products(title), departure:departures(departure_date)"
      )
      .eq("customer_name", String(name).trim())
      .in("customer_phone", [
        digits,
        `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`,
      ])
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;

    return NextResponse.json({ reservations: data ?? [] });
  } catch (e) {
    console.error("[reservations/lookup]", e);
    return NextResponse.json({ error: "조회 중 오류가 발생했습니다." }, { status: 500 });
  }
}
