import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

/**
 * GET ?status=&q= : 예약 목록
 *
 * q 검색 대상:
 * 1) 예약자 이름 / 전화번호 — 기존과 동일한 SQL or 필터
 * 2) 예약번호 — 화면 표기(UUID 앞 8자리 대문자) 기준.
 *    hex 4~8자 입력이면 UUID 범위(gte/lte)로 검색 (uuid는 캐스팅 없이 ilike 불가)
 * 3) 상품명 / 상품코드 — products!inner 조인으로 부모(예약) 필터
 *    (lib/api/products.ts의 categories!inner + eq("category.slug") 검증된 패턴과 동일)
 *
 * 각 갈래 결과를 id 기준으로 합쳐 최신순 정렬. q가 없으면 기존 동작 그대로.
 */

const SELECT_BASE =
  "*, product:products(title, product_code), departure:departures(departure_date), boarding_point:boarding_points(name, boarding_time)";
const SELECT_INNER =
  "*, product:products!inner(title, product_code), departure:departures(departure_date), boarding_point:boarding_points(name, boarding_time)";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const q = (url.searchParams.get("q") ?? "").trim();

  const sb = createAdminSupabase();

  const build = (select: string) => {
    let query = sb
      .from("reservations")
      .select(select)
      .order("created_at", { ascending: false })
      .limit(200);
    if (status && status !== "all") query = query.eq("status", status);
    return query;
  };

  try {
    // q 없음 — 기존 동작 그대로
    if (!q) {
      const { data, error } = await build(SELECT_BASE);
      if (error) throw error;
      return NextResponse.json({ reservations: data ?? [] });
    }

    const tasks: any[] = [
      // 1) 이름/전화번호 (기존과 동일)
      build(SELECT_BASE).or(
        `customer_name.ilike.%${q}%,customer_phone.ilike.%${q}%`
      ),
      // 3-a) 상품명
      build(SELECT_INNER).ilike("product.title", `%${q}%`),
      // 3-b) 상품코드 (YYYYMMDD001 형식 — 부분 입력도 매칭)
      build(SELECT_INNER).ilike("product.product_code", `%${q}%`),
    ];

    // 2) 예약번호 (UUID 앞자리) — hex 4~8자일 때만
    const hex = q.toLowerCase().replace(/-/g, "");
    if (/^[0-9a-f]{4,8}$/.test(hex)) {
      const lo = `${hex.padEnd(8, "0")}-0000-0000-0000-000000000000`;
      const hi = `${hex.padEnd(8, "f")}-ffff-ffff-ffff-ffffffffffff`;
      tasks.push(build(SELECT_BASE).gte("id", lo).lte("id", hi));
    }

    const results = await Promise.all(tasks);
    const merged = new Map<string, any>();
    for (const r of results) {
      if (r.error) throw r.error;
      for (const row of r.data ?? []) merged.set(row.id, row);
    }
    const reservations = Array.from(merged.values())
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 200);

    return NextResponse.json({ reservations });
  } catch (e: any) {
    console.error("[admin/reservations GET]", e);
    return NextResponse.json(
      { error: e?.message ?? "예약 목록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
