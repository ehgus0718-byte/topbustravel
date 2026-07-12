import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

// GET: 전체 리뷰 (미승인 포함)
// 인증: /admin, /api/admin 전체는 middleware.ts에서 tb_admin 쿠키를 검사하므로
// 여기서 별도 인증 코드가 없어도 이 라우트에는 관리자만 도달한다.
export async function GET() {
  const sb = createAdminSupabase();
  const { data, error } = await sb
    .from("reviews")
    .select("*, product:products(title)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reviews: data ?? [] });
}

// POST: 관리자가 직접 후기 작성 (초기 서비스 신뢰도 확보용)
// 일반 사용자 후기(/api/reviews)와 달리 기본으로 즉시 게시(is_visible=true)되고,
// 작성일을 임의로 지정할 수 있다(예: 실제 다녀온 날짜에 맞춰 표시).
export async function POST(req: Request) {
  try {
    const { product_id, author_name, rating, content, created_at } = await req.json();
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
      is_visible: true,
      ...(created_at ? { created_at: new Date(created_at).toISOString() } : {}),
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[admin reviews POST]", e);
    return NextResponse.json({ error: e.message || "등록 중 오류가 발생했습니다." }, { status: 500 });
  }
}
