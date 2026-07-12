import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

// GET: 전체 이벤트 (비공개 포함) — 관리자용
export async function GET() {
  const sb = createAdminSupabase();
  const { data, error } = await sb
    .from("events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: data ?? [] });
}

// POST: 이벤트 생성
export async function POST(req: Request) {
  try {
    const { title, content, banner_url, starts_on, ends_on, is_visible } = await req.json();
    if (!title?.trim()) {
      return NextResponse.json({ error: "제목을 입력해 주세요." }, { status: 400 });
    }
    const sb = createAdminSupabase();
    const { error } = await sb.from("events").insert({
      title: String(title).trim().slice(0, 200),
      content: String(content ?? "").slice(0, 5000),
      banner_url: banner_url || null,
      starts_on: starts_on || null,
      ends_on: ends_on || null,
      is_visible: is_visible !== false,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[admin/events POST]", e);
    return NextResponse.json({ error: e.message || "등록 실패" }, { status: 500 });
  }
}
