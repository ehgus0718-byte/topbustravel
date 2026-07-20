import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { sha256Hex, normalizePhone, OTP_MAX_ATTEMPTS } from "@/lib/otp";
import { verifyToken } from "@/lib/session";

/**
 * POST /api/reservations/edit-info { editToken, name, phone, otpCode? }
 * 고객 셀프 예약 정보 수정 (성함/휴대폰 번호만).
 * - editToken(본인확인 통과) 필수, 토큰의 rid 예약만 수정 가능
 * - 휴대폰 번호가 바뀌는 경우: 새 번호로 받은 otpCode 검증 필수
 * - 상태(status)·금액 등 다른 컬럼은 절대 건드리지 않음
 * - 확정 문자 재발송 없음 (변경 이후의 알림만 새 번호로 발송됨)
 * - 변경 내역은 reservation_change_logs에 필드별로 기록 (changed_by=customer)
 */
export async function POST(req: Request) {
  try {
    const { editToken, name: rawName, phone: rawPhone, otpCode } = await req.json();

    const payload = await verifyToken<{ t: string; rid: string; phone: string }>(
      editToken
    );
    if (!payload || payload.t !== "resv_edit") {
      return NextResponse.json(
        { error: "인증이 만료되었습니다. 처음부터 다시 진행해 주세요." },
        { status: 401 }
      );
    }

    const name = String(rawName || "").trim();
    const phone = normalizePhone(rawPhone);
    if (!name || name.length > 20) {
      return NextResponse.json(
        { error: "성함을 확인해 주세요. (20자 이내)" },
        { status: 400 }
      );
    }
    if (!phone) {
      return NextResponse.json(
        { error: "올바른 휴대폰 번호를 입력해 주세요." },
        { status: 400 }
      );
    }

    const sb = createAdminSupabase();

    const { data: r, error: getErr } = await sb
      .from("reservations")
      .select("id, status, customer_name, customer_phone")
      .eq("id", payload.rid)
      .maybeSingle();
    if (getErr) throw getErr;
    if (!r) {
      return NextResponse.json({ error: "예약을 찾을 수 없습니다." }, { status: 404 });
    }
    if (["canceled", "refunded"].includes(r.status)) {
      return NextResponse.json(
        { error: "취소/환불된 예약은 수정할 수 없습니다." },
        { status: 400 }
      );
    }

    const oldPhoneDigits = String(r.customer_phone).replace(/\D/g, "");
    const nameChanged = name !== r.customer_name;
    const phoneChanged = phone !== oldPhoneDigits;

    if (!nameChanged && !phoneChanged) {
      return NextResponse.json(
        { error: "변경된 내용이 없습니다." },
        { status: 400 }
      );
    }

    // 번호 변경 시: 새 번호로 발송된 인증번호 검증 (기존 verify-otp와 동일 로직)
    if (phoneChanged) {
      if (!/^\d{6}$/.test(otpCode || "")) {
        return NextResponse.json(
          { error: "새 휴대폰 번호로 받은 인증번호 6자리를 입력해 주세요." },
          { status: 400 }
        );
      }
      const { data: otp } = await sb
        .from("phone_otps")
        .select("*")
        .eq("phone", phone)
        .eq("verified", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!otp) {
        return NextResponse.json(
          { error: "인증번호가 만료되었습니다. 다시 요청해 주세요." },
          { status: 400 }
        );
      }
      if (otp.attempts >= OTP_MAX_ATTEMPTS) {
        return NextResponse.json(
          { error: "시도 횟수를 초과했습니다. 인증번호를 다시 요청해 주세요." },
          { status: 400 }
        );
      }
      const inputHash = await sha256Hex(`${phone}:${otpCode}`);
      if (inputHash !== otp.code_hash) {
        await sb
          .from("phone_otps")
          .update({ attempts: otp.attempts + 1 })
          .eq("id", otp.id);
        const left = OTP_MAX_ATTEMPTS - otp.attempts - 1;
        return NextResponse.json(
          { error: `인증번호가 일치하지 않습니다. (남은 시도 ${Math.max(left, 0)}회)` },
          { status: 400 }
        );
      }
      await sb.from("phone_otps").update({ verified: true }).eq("id", otp.id);
    }

    // 저장 형식은 기존 데이터와 동일한 하이픈 형식(010-1234-5678)으로 통일
    const phoneFormatted = `${phone.slice(0, 3)}-${phone.slice(3, phone.length - 4)}-${phone.slice(-4)}`;

    const updates: Record<string, string> = {
      updated_at: new Date().toISOString(),
    };
    if (nameChanged) updates.customer_name = name;
    if (phoneChanged) updates.customer_phone = phoneFormatted;

    const { error: updErr } = await sb
      .from("reservations")
      .update(updates)
      .eq("id", r.id);
    if (updErr) throw updErr;

    // 변경 이력 기록 (필드별 1행) — 이력 기록 실패가 수정 자체를 되돌리진 않도록 분리
    const logs = [];
    if (nameChanged)
      logs.push({
        reservation_id: r.id,
        changed_by: "customer",
        field: "customer_name",
        old_value: r.customer_name,
        new_value: name,
      });
    if (phoneChanged)
      logs.push({
        reservation_id: r.id,
        changed_by: "customer",
        field: "customer_phone",
        old_value: r.customer_phone,
        new_value: phoneFormatted,
      });
    if (logs.length > 0) {
      const { error: logErr } = await sb
        .from("reservation_change_logs")
        .insert(logs);
      if (logErr) console.error("[edit-info] change log insert failed", logErr);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[reservations/edit-info]", e);
    return NextResponse.json(
      { error: "수정 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
