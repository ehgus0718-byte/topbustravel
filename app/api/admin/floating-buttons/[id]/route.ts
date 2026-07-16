import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json();
    const patch: Record<string, unknown> = {};
    if (typeof body.label === "string") patch.label = body.label.trim().slice(0, 50);
    if (typeof body.link_url === "string") patch.link_url = body.link_url.trim().slice(0, 500);
    if ("icon_url" in body) patch.icon_url = body.icon_url || null;
    if (typeof body.new_tab === "boolean") patch.new_tab = body.new_tab;
    if ("sort_order" in body && Number.isFinite(Number(body.sort_order))) {
      patch.sort_order = Number(body.sort_order);
    }
    if (typeof body.is_visible === "boolean") patch.is_visible = body.is_visible;

    const sb = createAdminSupabase();
    const { error } = await sb.from("floating_buttons").update(patch).eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "수정 실패" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const sb = createAdminSupabase();
  const { error } = await sb.from("floating_buttons").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
