import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import {
  generateOtpCode,
  sha256Hex,
  normalizePhone,
  OTP_TTL_SECONDS,
  OTP_RESEND_COOLDOWN,
  OTP_DAILY_LIMIT_PHONE,
  OTP_DAILY_LIMIT_IP,
} from "@/lib/otp";
import { verifyToken } from "@/lib/session";
import { sendSms } from "@/lib/sms";

/**
 * POST /api/reservations/edit-send-otp { editToken, newPhone }
 * 휴대폰 번호 변경 시, "새 번호"로 인증번호를 발송해 소유 확인.
 * - editToken(본인확인 통과자)만 호출 가능 → 발송 API 오남용 차단
 * - 쿨다운/일일 한도는 기존 회원가입 OTP(phone_otps)와 동일 정책 공유
 * - 문자 문구도 기존과 동일 포맷 유지 (중복 시스템 방지)
 */
export async function POST(req: Request) {
  try {
    const { editToken, newPhone: rawPhone } = await req.json();

    const payload = await verifyToken<{ t: string; rid: string }>(editToken);
    if (!payload || payload.t !== "resv_edit") {
      return NextResponse.json(
        { error: "인증이 만료되었습니다. 처음부터 다시 진행해 주세요." },
        { status: 401 }
      );
    }

    const phone = normalizePhone(rawPhone);
    if (!phone) {
      return NextResponse.json(
        { error: "올바른 휴대폰 번호를 입력해 주세요." },
        { status: 400 }
      );
    }

    const ip =
      (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
      "unknown";
    const sb = createAdminSupabase();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 1) 같은 번호 60초 쿨다운
    const { data: recent } = await sb
      .from("phone_otps")
      .select("created_at")
      .eq("phone", phone)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recent) {
      const elapsed = (Date.now() - new Date(recent.created_at).getTime()) / 1000;
      if (elapsed < OTP_RESEND_COOLDOWN) {
        return NextResponse.json(
          {
            error: `${Math.ceil(OTP_RESEND_COOLDOWN - elapsed)}초 후에 다시 요청해 주세요.`,
          },
          { status: 429 }
        );
      }
    }

    // 2) 번호당 일일 한도
    const { count: phoneCount } = await sb
      .from("phone_otps")
      .select("id", { count: "exact", head: true })
      .eq("phone", phone)
      .gte("created_at", todayStart.toISOString());
    if ((phoneCount ?? 0) >= OTP_DAILY_LIMIT_PHONE) {
      return NextResponse.json(
        { error: "오늘 발송 한도를 초과했습니다. 내일 다시 시도해 주세요." },
        { status: 429 }
      );
    }

    // 3) IP당 일일 한도
    const { count: ipCount } = await sb
      .from("phone_otps")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .gte("created_at", todayStart.toISOString());
    if ((ipCount ?? 0) >= OTP_DAILY_LIMIT_IP) {
      return NextResponse.json(
        { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
        { status: 429 }
      );
    }

    const code = generateOtpCode();
    const { error: insErr } = await sb.from("phone_otps").insert({
      phone,
      code_hash: await sha256Hex(`${phone}:${code}`),
      ip,
      expires_at: new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString(),
    });
    if (insErr) throw insErr;

    await sendSms(phone, `[topBustravel] 인증번호 [${code}] 3분 안에 입력해 주세요.`);

    return NextResponse.json({ ok: true, ttl: OTP_TTL_SECONDS });
  } catch (e) {
    console.error("[reservations/edit-send-otp]", e);
    return NextResponse.json(
      { error: "인증번호 발송 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
