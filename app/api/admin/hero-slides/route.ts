import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

// GET: 전체 히어로 슬라이드 (비공개 포함) — 관리자용
export async function GET() {
  const sb = createAdminSupabase();
  const { data, error } = await sb
    .from("hero_slides")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ slides: data ?? [] });
}

// POST: 히어로 슬라이드 생성
export async function POST(req: Request) {
  try {
    const { badge, title, subtitle, image_url, link_url, starts_on, ends_on, sort_order, is_visible } =
      await req.json();
    if (!title?.trim()) {
      return NextResponse.json({ error: "제목을 입력해 주세요." }, { status: 400 });
    }
    if (!image_url?.trim()) {
      return NextResponse.json({ error: "배경 사진을 업로드해 주세요." }, { status: 400 });
    }
    const sb = createAdminSupabase();
    const { error } = await sb.from("hero_slides").insert({
      badge: badge?.trim() ? String(badge).trim().slice(0, 30) : null,
      title: String(title).trim().slice(0, 60),
      subtitle: subtitle?.trim() ? String(subtitle).trim().slice(0, 100) : null,
      image_url: String(image_url).trim().slice(0, 500),
      link_url: link_url?.trim() ? String(link_url).trim().slice(0, 500) : null,
      starts_on: starts_on || null,
      ends_on: ends_on || null,
      sort_order: Number.isFinite(Number(sort_order)) ? Number(sort_order) : 0,
      is_visible: is_visible !== false,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[admin/hero-slides POST]", e);
    return NextResponse.json({ error: e.message || "등록 실패" }, { status: 500 });
  }
}
