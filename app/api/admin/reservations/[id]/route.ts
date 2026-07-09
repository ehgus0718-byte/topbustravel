import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ id: string }> };

// PATCH: 예약 상태/메모 변경 (+ 좌석 수 자동 보정)
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json();
  const sb = createAdminSupabase();

  const { data: before, error: getErr } = await sb
    .from("reservations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (getErr) return NextResponse.json({ error: getErr.message }, { status: 500 });
  if (!before) return NextResponse.json({ error: "not found" }, { status: 404 });

  const allowed: any = {};
  if ("status" in body) allowed.status = body.status;
  if ("admin_note" in body) allowed.admin_note = body.admin_note;

  const { error } = await sb.from("reservations").update(allowed).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 좌석 보정: 유효(paid/confirmed) <-> 무효(그 외) 전환 시 departures 반영
  if ("status" in body && before.departure_id) {
    const wasActive = ["paid", "confirmed"].includes(before.status);
    const isActive = ["paid", "confirmed"].includes(body.status);
    const seats = before.adult_count + before.child_count + before.infant_count;
    if (!wasActive && isActive) {
      await sb.rpc("increment_reserved_seats", { dep_id: before.departure_id, cnt: seats });
    } else if (wasActive && !isActive) {
      await sb.rpc("increment_reserved_seats", { dep_id: before.departure_id, cnt: -seats });
    }
  }

  return NextResponse.json({ ok: true });
}
