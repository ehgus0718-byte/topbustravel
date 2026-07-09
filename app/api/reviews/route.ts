import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

// POST /api/reviews — 후기 접수 (관리자 승인 후 노출)
export async function POST(req: Request) {
  try {
    const { product_id, author_name, rating, content } = await req.json();
    if (!product_id || !author_name?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "필수 정보가 누락되었습니다." }, { status: 400 });
    }
    const r = Math.min(5, Math.max(1, Number(rating) || 5));
    const sb = createAdminSupabase();
    const { error } = await sb.from("reviews").insert({
      product_id,
      author_name: String(author_name).trim().slice(0, 30),
      rating: r,
      content: String(content).trim().slice(0, 1000),
      is_visible: false,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[reviews POST]", e);
    return NextResponse.json({ error: "등록 중 오류가 발생했습니다." }, { status: 500 });
  }
}
