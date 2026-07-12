import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

// GET /api/admin/users?q=검색어
// 읽기 전용: 회원 정보를 수정/삭제하는 기능은 없음 (로그인/세션과 맞닿은 민감 데이터라
// 이번 단계에서는 조회만 제공하고, 필요 시 별도 검토 후 추가).
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();

    const sb = createAdminSupabase();
    let query = sb
      .from("users")
      .select("id, name, phone, created_at, last_login_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (q) {
      query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
    }
    const { data: users, error } = await query;
    if (error) throw error;

    const phones = (users ?? []).map((u) => u.phone).filter(Boolean);
    let reservationRows: { customer_phone: string; total_amount: number; status: string }[] = [];
    if (phones.length > 0) {
      const { data: rows, error: resErr } = await sb
        .from("reservations")
        .select("customer_phone, total_amount, status")
        .in("customer_phone", phones);
      if (resErr) throw resErr;
      reservationRows = rows ?? [];
    }

    // 전화번호 기준 집계 (외래키가 아니라 전화번호 매칭 — 마이페이지와 동일한 방식)
    const stats = new Map<string, { count: number; spent: number }>();
    for (const r of reservationRows) {
      const cur = stats.get(r.customer_phone) ?? { count: 0, spent: 0 };
      cur.count += 1;
      if (r.status === "paid" || r.status === "confirmed") {
        cur.spent += r.total_amount || 0;
      }
      stats.set(r.customer_phone, cur);
    }

    const result = (users ?? []).map((u) => ({
      ...u,
      reservationCount: stats.get(u.phone)?.count ?? 0,
      totalSpent: stats.get(u.phone)?.spent ?? 0,
    }));

    return NextResponse.json({ users: result });
  } catch (e) {
    console.error("[admin/users GET]", e);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}
