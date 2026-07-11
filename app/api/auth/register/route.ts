import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import {
  verifyToken,
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/session";

/**
 * POST /api/auth/register { signupToken, name, agree }
 * verify-otp에서 받은 가입 토큰으로만 가입 가능 (전화번호 소유 증명 완료 상태)
 */
export async function POST(req: Request) {
  try {
    const { signupToken, name: rawName, agree } = await req.json();

    const payload = await verifyToken<{ t: string; phone: string }>(signupToken);
    if (!payload || payload.t !== "signup" || !payload.phone) {
      return NextResponse.json(
        { error: "인증이 만료되었습니다. 처음부터 다시 진행해 주세요." },
        { status: 401 }
      );
    }
    const name = String(rawName || "").trim();
    if (name.length < 1 || name.length > 20) {
      return NextResponse.json(
        { error: "이름을 1~20자로 입력해 주세요." },
        { status: 400 }
      );
    }
    if (agree !== true) {
      return NextResponse.json(
        { error: "약관에 동의해 주세요." },
        { status: 400 }
      );
    }

    const sb = createAdminSupabase();

    // 동시 가입/중복 방어: 이미 있으면 그 계정으로 로그인 처리
    const { data: existing } = await sb
      .from("users")
      .select("id, name")
      .eq("phone", payload.phone)
      .maybeSingle();

    let uid: string;
    let finalName: string;
    if (existing) {
      uid = existing.id;
      finalName = existing.name;
      await sb
        .from("users")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", uid);
    } else {
      const { data: created, error: insErr } = await sb
        .from("users")
        .insert({
          phone: payload.phone,
          name,
          last_login_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (insErr) throw insErr;
      uid = created.id;
      finalName = name;
    }

    const token = await createSessionToken({
      uid,
      name: finalName,
      phone: payload.phone,
    });
    const res = NextResponse.json({ ok: true, name: finalName });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    return res;
  } catch (e) {
    console.error("[auth/register]", e);
    return NextResponse.json(
      { error: "가입 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
