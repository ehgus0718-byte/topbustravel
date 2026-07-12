import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

// GET /api/notices — 사용자용. 공개(is_visible=true)된 공지만 반환.
// 관리자용(/api/admin/notices)과 분리하여 비공개 항목이 사용자에게 노출되지 않도록 함.
export async function GET() {
  const sb = createAdminSupabase();
  const { data, error } = await sb
    .from("notices")
    .select("id, title, content, is_pinned, created_at")
    .eq("is_visible", true)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  return NextResponse.json({ notices: data ?? [] });
}
