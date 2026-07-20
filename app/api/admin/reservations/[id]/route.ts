import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/otp";

type Ctx = { params: Promise<{ id: string }> };

// PATCH: 예약 상태/메모 변경 (+ 좌석 수 자동 보정)
// + 고객 성함/휴대폰 번호 수정 (변경 이력 기록, changed_by=admin)
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

  // ── 고객 정보 수정 (성함/휴대폰 번호) — 상태·금액 등 다른 컬럼은 기존과 동일하게 불변 ──
  const changeLogs: any[] = [];

  if ("customer_name" in body) {
    const name = String(body.customer_name || "").trim();
    if (!name || name.length > 20) {
      return NextResponse.json(
        { error: "성함을 확인해 주세요. (20자 이내)" },
        { status: 400 }
      );
    }
    if (name !== before.customer_name) {
      allowed.customer_name = name;
      changeLogs.push({
        reservation_id: id,
        changed_by: "admin",
        admin_id: "admin",
        field: "customer_name",
        old_value: before.customer_name,
        new_value: name,
      });
    }
  }

  if ("customer_phone" in body) {
    const digits = normalizePhone(body.customer_phone);
    if (!digits) {
      return NextResponse.json(
        { error: "올바른 휴대폰 번호를 입력해 주세요." },
        { status: 400 }
      );
    }
    const formatted = `${digits.slice(0, 3)}-${digits.slice(3, digits.length - 4)}-${digits.slice(-4)}`;
    if (formatted !== before.customer_phone) {
      allowed.customer_phone = formatted;
      changeLogs.push({
        reservation_id: id,
        changed_by: "admin",
        admin_id: "admin",
        field: "customer_phone",
        old_value: before.customer_phone,
        new_value: formatted,
      });
    }
  }

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ ok: true, unchanged: true });
  }
  if (changeLogs.length > 0) {
    allowed.updated_at = new Date().toISOString();
  }

  const { error } = await sb.from("reservations").update(allowed).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 변경 이력 기록 — 실패해도 수정 자체는 유지하고 로그만 남김
  if (changeLogs.length > 0) {
    const { error: logErr } = await sb
      .from("reservation_change_logs")
      .insert(changeLogs);
    if (logErr) console.error("[admin/reservations] change log insert failed", logErr);
  }

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
