import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { sha256Hex, normalizePhone, OTP_MAX_ATTEMPTS } from "@/lib/otp";
import {
  createSessionToken,
  signToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/session";
import { isPastDue, purgeWithdrawnUser, formatKoreanDate } from "@/lib/account";

/**
 * POST /api/auth/verify-otp { phone, code }
 * - 기존 회원: 세션 쿠키 발급 → { status: "logged_in", name }
 * - 신규: 10분짜리 가입 토큰 발급 → { status: "need_signup", signupToken }
 */
export async function POST(req: Request) {
  try {
    const { phone: rawPhone, code } = await req.json();
    const phone = normalizePhone(rawPhone);
    if (!phone || !/^\d{6}$/.test(code || "")) {
      return NextResponse.json(
        { error: "휴대폰 번호와 인증번호 6자리를 확인해 주세요." },
        { status: 400 }
      );
    }

    const sb = createAdminSupabase();

    // 가장 최근 유효 인증번호 조회
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

    // 인증 성공 — 재사용 방지 마킹
    await sb.from("phone_otps").update({ verified: true }).eq("id", otp.id);

    // 기존 회원 여부 확인
    const { data: user } = await sb
      .from("users")
      .select("id, name, withdraw_scheduled_at")
      .eq("phone", phone)
      .maybeSingle();

    // 탈퇴 신청 상태 처리
    if (user?.withdraw_scheduled_at) {
      if (isPastDue(user.withdraw_scheduled_at)) {
        // 유예 종료 — 이 시점에 실제로 정리하고 신규 가입으로 안내
        await purgeWithdrawnUser(sb, user.id);
        const signupToken = await signToken({ t: "signup", phone }, 600);
        return NextResponse.json({ status: "need_signup", signupToken });
      }
      // 유예 중 — 바로 로그인시키지 않고 탈퇴 취소 여부를 묻는다
      const restoreToken = await signToken({ t: "restore", uid: user.id }, 600);
      return NextResponse.json({
        status: "withdraw_pending",
        restoreToken,
        scheduledText: formatKoreanDate(user.withdraw_scheduled_at),
      });
    }

    if (user) {
      await sb
        .from("users")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", user.id);

      const token = await createSessionToken({
        uid: user.id,
        name: user.name,
        phone,
      });
      const res = NextResponse.json({ status: "logged_in", name: user.name });
      res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
      return res;
    }

    // 신규 — 가입 완료 단계용 단기 토큰 (10분)
    const signupToken = await signToken({ t: "signup", phone }, 600);
    return NextResponse.json({ status: "need_signup", signupToken });
  } catch (e) {
    console.error("[auth/verify-otp]", e);
    return NextResponse.json(
      { error: "인증 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
