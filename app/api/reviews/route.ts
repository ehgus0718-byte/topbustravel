import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/session";
import { maskName } from "@/lib/format";

// POST /api/reviews — 후기 접수 (관리자 승인 후 노출)
// 로그인 필수: 비회원 우회 방지를 위해 클라이언트 값이 아닌 서버 세션으로만 판단.
// 작성자명은 클라이언트에서 받지 않고 세션의 회원 이름을 마스킹해 자동 저장.
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "로그인 후 이용해 주세요." }, { status: 401 });
  }

  try {
    const { product_id, rating, content, image_urls } = await req.json();
    if (!product_id || !content?.trim()) {
      return NextResponse.json({ error: "필수 정보가 누락되었습니다." }, { status: 400 });
    }
    const r = Math.min(5, Math.max(1, Number(rating) || 5));
    const photos = Array.isArray(image_urls)
      ? image_urls.filter((u) => typeof u === "string" && u.startsWith("http")).slice(0, 6)
      : [];
    const sb = createAdminSupabase();
    const { error } = await sb.from("reviews").insert({
      product_id,
      author_name: maskName(user.name || "고객"),
      rating: r,
      content: String(content).trim().slice(0, 1000),
      image_urls: photos,
      is_visible: false,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[reviews POST]", e);
    return NextResponse.json({ error: "등록 중 오류가 발생했습니다." }, { status: 500 });
  }
}
