import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

// GET: 전체 팝업 (비공개 포함) — 관리자용
export async function GET() {
  const sb = createAdminSupabase();
  const { data, error } = await sb
    .from("popups")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ popups: data ?? [] });
}

// POST: 팝업 생성
export async function POST(req: Request) {
  try {
    const { title, content, image_url, link_url, starts_on, ends_on, sort_order, is_visible } =
      await req.json();
    if (!title?.trim()) {
      return NextResponse.json({ error: "제목을 입력해 주세요." }, { status: 400 });
    }
    const sb = createAdminSupabase();
    const { error } = await sb.from("popups").insert({
      title: String(title).trim().slice(0, 200),
      content: String(content ?? "").slice(0, 2000),
      image_url: image_url || null,
      link_url: link_url || null,
      starts_on: starts_on || null,
      ends_on: ends_on || null,
      sort_order: Number.isFinite(Number(sort_order)) ? Number(sort_order) : 0,
      is_visible: is_visible !== false,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[admin/popups POST]", e);
    return NextResponse.json({ error: e.message || "등록 실패" }, { status: 500 });
  }
}
