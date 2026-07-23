import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/session";

// GET: 로그인 회원의 찜 목록(상품 id 배열)만 반환 — 카드마다 조회할 필요 없이 한 번에
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ids: [] });
  const sb = createAdminSupabase();
  const { data, error } = await sb
    .from("wishlists")
    .select("product_id")
    .eq("user_uid", user.uid);
  if (error) return NextResponse.json({ ids: [] });
  return NextResponse.json({ ids: (data ?? []).map((r) => r.product_id) });
}

// POST: 찜 추가
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  try {
    const { product_id } = await req.json();
    if (!product_id) return NextResponse.json({ error: "상품 정보가 없습니다." }, { status: 400 });
    const sb = createAdminSupabase();
    const { error } = await sb
      .from("wishlists")
      .upsert({ user_uid: user.uid, product_id }, { onConflict: "user_uid,product_id" });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "찜 추가 실패" }, { status: 500 });
  }
}

// DELETE: 찜 해제 (?product_id=)
export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const productId = new URL(req.url).searchParams.get("product_id");
  if (!productId) return NextResponse.json({ error: "상품 정보가 없습니다." }, { status: 400 });
  const sb = createAdminSupabase();
  const { error } = await sb
    .from("wishlists")
    .delete()
    .eq("user_uid", user.uid)
    .eq("product_id", productId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
