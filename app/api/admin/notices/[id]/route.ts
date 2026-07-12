import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ id: string }> };

// PATCH: 부분 수정 (전달된 필드만 반영)
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json();
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.title === "string") patch.title = body.title.trim().slice(0, 200);
    if (typeof body.content === "string") patch.content = body.content.slice(0, 5000);
    if (typeof body.is_pinned === "boolean") patch.is_pinned = body.is_pinned;
    if (typeof body.is_visible === "boolean") patch.is_visible = body.is_visible;

    const sb = createAdminSupabase();
    const { error } = await sb.from("notices").update(patch).eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "수정 실패" }, { status: 500 });
  }
}

// DELETE: 삭제
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const sb = createAdminSupabase();
  const { error } = await sb.from("notices").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
