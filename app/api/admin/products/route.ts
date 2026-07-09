import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { saveChildren } from "@/lib/adminHelpers";

// GET: 전체 상품 목록 (비활성 포함)
export async function GET() {
  const sb = createAdminSupabase();
  const { data, error } = await sb
    .from("products")
    .select("*, category:categories(name)")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data ?? [] });
}

// POST: 상품 생성
export async function POST(req: Request) {
  try {
    const { children, ...fields } = await req.json();
    const sb = createAdminSupabase();
    const { data: product, error } = await sb
      .from("products")
      .insert(fields)
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await saveChildren(sb, product.id, children);
    return NextResponse.json({ id: product.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "저장 실패" }, { status: 500 });
  }
}
