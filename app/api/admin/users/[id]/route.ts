import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/otp";

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/users/[id] { name?, phone? }
 *
 * 고객이 이미 번호를 바꿔 구번호로 인증을 못 받는 경우, 고객 스스로는 복구가 불가능하다.
 * 그 구제 경로로만 사용하는 기능이므로 안전장치를 함께 둔다.
 *  - 다른 회원이 쓰는 번호면 차단 (남의 계정 접근 사고 방지)
 *  - 번호 변경은 이력에 남긴다 (분쟁 대비)
 */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json();
    const sb = createAdminSupabase();

    const { data: target } = await sb
      .from("users")
      .select("id, name, phone")
      .eq("id", id)
      .maybeSingle();
    if (!target) {
      return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });
    }

    const patch: Record<string, unknown> = {};

    if (typeof body.name === "string") {
      const name = body.name.trim().slice(0, 30);
      if (name.length < 2) {
        return NextResponse.json({ error: "이름을 2자 이상 입력해 주세요." }, { status: 400 });
      }
      patch.name = name;
    }

    let phoneChanged: { from: string; to: string } | null = null;
    if (typeof body.phone === "string" && body.phone.trim()) {
      const phone = normalizePhone(body.phone);
      if (!phone) {
        return NextResponse.json(
          { error: "올바른 휴대폰 번호를 입력해 주세요." },
          { status: 400 }
        );
      }
      if (phone !== target.phone) {
        const { data: taken } = await sb
          .from("users")
          .select("id")
          .eq("phone", phone)
          .neq("id", id)
          .maybeSingle();
        if (taken) {
          return NextResponse.json(
            { error: "이미 다른 회원이 사용 중인 번호입니다." },
            { status: 409 }
          );
        }
        patch.phone = phone;
        phoneChanged = { from: target.phone, to: phone };
      }
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: true, unchanged: true });
    }

    const { error } = await sb.from("users").update(patch).eq("id", id);
    if (error) throw error;

    if (phoneChanged) {
      // 과거 예약이 계속 연결되도록 회원 고유번호를 채워둔다
      await sb
        .from("reservations")
        .update({ user_uid: id })
        .is("user_uid", null)
        .eq("customer_phone", phoneChanged.from);

      await sb.from("user_phone_changes").insert({
        user_id: id,
        old_phone: phoneChanged.from,
        new_phone: phoneChanged.to,
        changed_by: "admin",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[admin/users PATCH]", e);
    return NextResponse.json({ error: e.message || "수정 실패" }, { status: 500 });
  }
}
