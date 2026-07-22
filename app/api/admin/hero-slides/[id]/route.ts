import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json();
    const patch: Record<string, unknown> = {};
    if ("badge" in body) patch.badge = body.badge?.trim() ? String(body.badge).trim().slice(0, 30) : null;
    if (typeof body.title === "string") patch.title = body.title.trim().slice(0, 60);
    if ("subtitle" in body)
      patch.subtitle = body.subtitle?.trim() ? String(body.subtitle).trim().slice(0, 100) : null;
    if (typeof body.image_url === "string") patch.image_url = body.image_url.trim().slice(0, 500);
    if ("link_url" in body)
      patch.link_url = body.link_url?.trim() ? String(body.link_url).trim().slice(0, 500) : null;
    if ("starts_on" in body) patch.starts_on = body.starts_on || null;
    if ("ends_on" in body) patch.ends_on = body.ends_on || null;
    if ("sort_order" in body && Number.isFinite(Number(body.sort_order))) {
      patch.sort_order = Number(body.sort_order);
    }
    if (typeof body.is_visible === "boolean") patch.is_visible = body.is_visible;

    const sb = createAdminSupabase();
    const { error } = await sb.from("hero_slides").update(patch).eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "수정 실패" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const sb = createAdminSupabase();
  const { error } = await sb.from("hero_slides").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
