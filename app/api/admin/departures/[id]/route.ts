import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ id: string }> };

// PUT: 출발일 수정 (가격/좌석/최소출발인원/상태)
export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json();
  const allowed: any = {};
  for (const k of ["adult_price", "child_price", "infant_price", "total_seats", "reserved_seats", "min_seats", "status"]) {
    if (k in body) allowed[k] = body[k];
  }
  const sb = createAdminSupabase();
  const { error } = await sb.from("departures").update(allowed).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE: 출발일 삭제
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const sb = createAdminSupabase();
  const { error } = await sb.from("departures").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
