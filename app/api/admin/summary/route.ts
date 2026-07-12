import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const sb = createAdminSupabase();
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    const [
      products,
      pending,
      paidToday,
      newInquiries,
      recent,
      // ── 아래 4개는 이번에 추가된 조회 — 기존 5개 쿼리는 그대로 유지 ──
      todayRevenueRows,
      monthRevenueRows,
      departuresToday,
      departuresTomorrow,
    ] = await Promise.all([
      sb.from("products").select("id", { count: "exact", head: true }),
      sb.from("reservations").select("id", { count: "exact", head: true }).eq("status", "pending"),
      sb.from("reservations").select("id", { count: "exact", head: true }).in("status", ["paid", "confirmed"]).gte("created_at", today),
      sb.from("inquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
      sb.from("reservations")
        .select("id, customer_name, status, total_amount, created_at, product:products(title), departure:departures(departure_date)")
        .order("created_at", { ascending: false })
        .limit(10),
      sb.from("reservations")
        .select("total_amount")
        .in("status", ["paid", "confirmed"])
        .gte("created_at", today),
      sb.from("reservations")
        .select("total_amount")
        .in("status", ["paid", "confirmed"])
        .gte("created_at", monthStart),
      // departures 테이블을 직접 조회 (reservations와의 조인 방식 변경 없이 안전하게)
      sb.from("departures")
        .select("id, departure_date, reserved_seats, total_seats, product:products(title)")
        .eq("departure_date", today)
        .order("departure_date"),
      sb.from("departures")
        .select("id, departure_date, reserved_seats, total_seats, product:products(title)")
        .eq("departure_date", tomorrowStr)
        .order("departure_date"),
    ]);

    const sumAmount = (rows: { total_amount: number }[] | null) =>
      (rows ?? []).reduce((s, r) => s + (r.total_amount || 0), 0);

    return NextResponse.json({
      // 기존 필드 — 그대로 유지
      productCount: products.count ?? 0,
      pendingCount: pending.count ?? 0,
      todayPaidCount: paidToday.count ?? 0,
      newInquiryCount: newInquiries.count ?? 0,
      recentReservations: recent.data ?? [],
      // 추가 필드
      todayRevenue: sumAmount(todayRevenueRows.data),
      monthRevenue: sumAmount(monthRevenueRows.data),
      departuresToday: departuresToday.data ?? [],
      departuresTomorrow: departuresTomorrow.data ?? [],
    });
  } catch (e) {
    console.error("[admin/summary]", e);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}
