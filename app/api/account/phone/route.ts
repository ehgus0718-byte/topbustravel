import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { sha256Hex, normalizePhone, OTP_MAX_ATTEMPTS } from "@/lib/otp";
import {
  getSessionUser,
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/session";

/**
 * POST /api/account/phone { phone, code }
 * 새 번호로 받은 인증번호를 확인한 뒤 로그인 번호를 변경한다.
 * 번호는 곧 로그인 수단이므로 인증을 반드시 거친다.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const { phone: rawPhone, code } = await req.json();
    const phone = normalizePhone(rawPhone);
    if (!phone || !/^\d{6}$/.test(code || "")) {
      return NextResponse.json(
        { error: "휴대폰 번호와 인증번호 6자리를 확인해 주세요." },
        { status: 400 }
      );
    }
    if (phone === user.phone) {
      return NextResponse.json({ error: "현재 사용 중인 번호입니다." }, { status: 400 });
    }

    const sb = createAdminSupabase();

    // 다른 회원이 이미 쓰는 번호면 차단 (계정 중복 방지)
    const { data: taken } = await sb
      .from("users")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();
    if (taken) {
      return NextResponse.json({ error: "이미 가입된 번호입니다." }, { status: 409 });
    }

    // 새 번호로 발송된 인증번호 검증 (로그인과 동일한 절차)
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
    const inputHash = await sha256Hex(`${phone}:${code}`);
    if (inputHash !== otp.code_hash) {
      await sb.from("phone_otps").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
      const left = OTP_MAX_ATTEMPTS - otp.attempts - 1;
      return NextResponse.json(
        { error: `인증번호가 일치하지 않습니다. (남은 시도 ${Math.max(left, 0)}회)` },
        { status: 400 }
      );
    }
    await sb.from("phone_otps").update({ verified: true }).eq("id", otp.id);

    const oldPhone = user.phone;

    // 과거 예약이 계속 마이페이지에 보이도록 회원 연결을 먼저 확실히 채운다
    await sb
      .from("reservations")
      .update({ user_uid: user.uid })
      .is("user_uid", null)
      .eq("customer_phone", oldPhone);

    const { error: upErr } = await sb
      .from("users")
      .update({ phone })
      .eq("id", user.uid);
    if (upErr) throw upErr;

    // 변경 이력 (분쟁 대비) — 실패해도 변경 자체는 유효
    await sb.from("user_phone_changes").insert({
      user_id: user.uid,
      old_phone: oldPhone,
      new_phone: phone,
      changed_by: "user",
    });

    const token = await createSessionToken({ uid: user.uid, name: user.name, phone });
    const res = NextResponse.json({ ok: true, phone });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    return res;
  } catch (e: any) {
    console.error("[account/phone]", e);
    return NextResponse.json({ error: "번호 변경에 실패했습니다." }, { status: 500 });
  }
}
