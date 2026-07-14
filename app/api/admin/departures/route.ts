import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

// GET ?product_id= : 해당 상품 출발일 목록 (오늘 이후)
export async function GET(req: Request) {
  const productId = new URL(req.url).searchParams.get("product_id");
  if (!productId) return NextResponse.json({ departures: [] });

  const sb = createAdminSupabase();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await sb
    .from("departures")
    .select("*")
    .eq("product_id", productId)
    .gte("departure_date", today)
    .order("departure_date");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ departures: data ?? [] });
}

// POST: 출발일 일괄 등록
// { product_id, start_date, end_date, weekdays: [0-6], adult_price?, child_price?, total_seats, min_seats? }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { product_id, start_date, end_date, weekdays, adult_price, child_price, total_seats, min_seats } = body;
    if (!product_id || !start_date || !end_date || !Array.isArray(weekdays) || weekdays.length === 0) {
      return NextResponse.json({ error: "필수 값이 누락되었습니다." }, { status: 400 });
    }

    const rows: any[] = [];
    const cur = new Date(start_date + "T00:00:00");
    const end = new Date(end_date + "T00:00:00");
    while (cur <= end && rows.length < 200) {
      if (weekdays.includes(cur.getDay())) {
        rows.push({
          product_id,
          departure_date: cur.toISOString().slice(0, 10),
          adult_price: adult_price || null,
          child_price: child_price || null,
          total_seats: Number(total_seats) || 40,
          min_seats: Number(min_seats) || 0,
        });
      }
      cur.setDate(cur.getDate() + 1);
    }
    if (rows.length === 0) {
      return NextResponse.json({ error: "생성할 날짜가 없습니다." }, { status: 400 });
    }

    const sb = createAdminSupabase();
    const { error } = await sb
      .from("departures")
      .upsert(rows, { onConflict: "product_id,departure_date", ignoreDuplicates: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, count: rows.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "등록 실패" }, { status: 500 });
  }
}
