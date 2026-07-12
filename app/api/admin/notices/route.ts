import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

// GET: 전체 공지 (비공개 포함) — 관리자용. 미들웨어에서 관리자 인증됨.
export async function GET() {
  const sb = createAdminSupabase();
  const { data, error } = await sb
    .from("notices")
    .select("*")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notices: data ?? [] });
}

// POST: 공지 생성
export async function POST(req: Request) {
  try {
    const { title, content, is_pinned, is_visible } = await req.json();
    if (!title?.trim()) {
      return NextResponse.json({ error: "제목을 입력해 주세요." }, { status: 400 });
    }
    const sb = createAdminSupabase();
    const { error } = await sb.from("notices").insert({
      title: String(title).trim().slice(0, 200),
      content: String(content ?? "").slice(0, 5000),
      is_pinned: !!is_pinned,
      is_visible: is_visible !== false,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[admin/notices POST]", e);
    return NextResponse.json({ error: e.message || "등록 실패" }, { status: 500 });
  }
}
