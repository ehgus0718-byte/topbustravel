import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const sb = createAdminSupabase();
    const today = new Date().toISOString().slice(0, 10);

    const [products, pending, paidToday, newInquiries, recent] = await Promise.all([
      sb.from("products").select("id", { count: "exact", head: true }),
      sb.from("reservations").select("id", { count: "exact", head: true }).eq("status", "pending"),
      sb.from("reservations").select("id", { count: "exact", head: true }).in("status", ["paid", "confirmed"]).gte("created_at", today),
      sb.from("inquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
      sb.from("reservations")
        .select("id, customer_name, status, total_amount, created_at, product:products(title), departure:departures(departure_date)")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    return NextResponse.json({
      productCount: products.count ?? 0,
      pendingCount: pending.count ?? 0,
      todayPaidCount: paidToday.count ?? 0,
      newInquiryCount: newInquiries.count ?? 0,
      recentReservations: recent.data ?? [],
    });
  } catch (e) {
    console.error("[admin/summary]", e);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}
