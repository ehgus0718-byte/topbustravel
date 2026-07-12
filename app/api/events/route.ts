import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

// GET /api/events — 사용자용. 공개된 이벤트만 반환.
export async function GET() {
  const sb = createAdminSupabase();
  const { data, error } = await sb
    .from("events")
    .select("id, title, content, banner_url, starts_on, ends_on, created_at")
    .eq("is_visible", true)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  return NextResponse.json({ events: data ?? [] });
}
