import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

// GET: 전체 플로팅 버튼 (비공개 포함) — 관리자용
export async function GET() {
  const sb = createAdminSupabase();
  const { data, error } = await sb
    .from("floating_buttons")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ buttons: data ?? [] });
}

// POST: 플로팅 버튼 생성
export async function POST(req: Request) {
  try {
    const { label, link_url, icon_url, new_tab, sort_order, is_visible } = await req.json();
    if (!label?.trim()) {
      return NextResponse.json({ error: "버튼 이름을 입력해 주세요." }, { status: 400 });
    }
    if (!link_url?.trim()) {
      return NextResponse.json({ error: "링크 주소를 입력해 주세요." }, { status: 400 });
    }
    const sb = createAdminSupabase();
    const { error } = await sb.from("floating_buttons").insert({
      label: String(label).trim().slice(0, 50),
      link_url: String(link_url).trim().slice(0, 500),
      icon_url: icon_url || null,
      new_tab: new_tab !== false,
      sort_order: Number.isFinite(Number(sort_order)) ? Number(sort_order) : 0,
      is_visible: is_visible !== false,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[admin/floating-buttons POST]", e);
    return NextResponse.json({ error: e.message || "등록 실패" }, { status: 500 });
  }
}
