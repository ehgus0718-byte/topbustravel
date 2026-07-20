import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ id: string }> };

// GET: 예약 변경 이력 조회 (이전 정보 → 변경된 정보)
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const sb = createAdminSupabase();

  const { data, error } = await sb
    .from("reservation_change_logs")
    .select("id, changed_by, admin_id, field, old_value, new_value, created_at")
    .eq("reservation_id", id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ logs: data ?? [] });
}
