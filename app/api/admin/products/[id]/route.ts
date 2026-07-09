import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { saveChildren } from "@/lib/adminHelpers";

type Ctx = { params: Promise<{ id: string }> };

// GET: 상품 상세 (하위 데이터 포함)
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const sb = createAdminSupabase();
  const { data, error } = await sb
    .from("products")
    .select("*, images:product_images(*), boarding_points(*), itinerary:itinerary_items(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });

  const bySort = (a: any, b: any) => a.sort_order - b.sort_order;
  data.images = (data.images ?? []).sort(bySort);
  data.boarding_points = (data.boarding_points ?? []).sort(bySort);
  data.itinerary = (data.itinerary ?? []).sort(
    (a: any, b: any) => a.day_no - b.day_no || a.sort_order - b.sort_order
  );
  return NextResponse.json({ product: data });
}

// PUT: 상품 수정
export async function PUT(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const { children, ...fields } = await req.json();
    const sb = createAdminSupabase();
    const { error } = await sb.from("products").update(fields).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await saveChildren(sb, id, children);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "저장 실패" }, { status: 500 });
  }
}

// DELETE: 상품 삭제
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const sb = createAdminSupabase();
  const { error } = await sb.from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
