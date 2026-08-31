import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import {
  exchangeCodeForToken,
  fetchKakaoProfile,
  KAKAO_STATE_COOKIE,
  loginErrorPath,
} from "@/lib/kakao";
import {
  createSessionToken,
  signToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/session";
import { isPastDue, purgeWithdrawnUser, formatKoreanDate } from "@/lib/account";

/** GET /api/auth/kakao/callback?code=&state= */
export async function GET(req: Request) {
  const url = new URL(req.url);

  // 프록시 뒤에서는 req.url 이 내부 주소로 잡히므로 상대경로로만 리다이렉트한다.
  const redirectTo = (path: string) =>
    new NextResponse(null, { status: 303, headers: { Location: path } });

  // state 대조 (쿠키에 "state|next" 로 저장해 둠)
  const cookieRaw = req.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${KAKAO_STATE_COOKIE}=`))
    ?.slice(KAKAO_STATE_COOKIE.length + 1);
  const [savedState, savedNext] = decodeURIComponent(cookieRaw || "").split("|");
  const next = savedNext && savedNext.startsWith("/") ? savedNext : "/my";

  const clearState = (res: NextResponse) => {
    res.cookies.set(KAKAO_STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  };

  const fail = (msg: string) => clearState(redirectTo(loginErrorPath(msg, next)));

  try {
    if (url.searchParams.get("error")) {
      return fail("카카오 로그인이 취소되었습니다.");
    }

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code) return fail("카카오 인증 정보가 없습니다. 다시 시도해 주세요.");
    if (!savedState || state !== savedState) {
      return fail("인증 정보가 만료되었습니다. 다시 시도해 주세요.");
    }

    const accessToken = await exchangeCodeForToken(code);
    if (!accessToken) return fail("카카오 인증에 실패했습니다. 다시 시도해 주세요.");

    const profile = await fetchKakaoProfile(accessToken);
    if (!profile?.kakaoId) {
      return fail("카카오 사용자 정보를 가져오지 못했습니다.");
    }
    if (!profile.phone) {
      return fail(
        "카카오 계정에서 국내 휴대폰 번호를 확인하지 못했습니다. 휴대폰 번호로 로그인해 주세요."
      );
    }

    const sb = createAdminSupabase();

    // 1) 이미 연결된 카카오 계정
    let { data: user } = await sb
      .from("users")
      .select("id, name, phone, withdraw_scheduled_at")
      .eq("kakao_id", profile.kakaoId)
      .maybeSingle();

    // 2) 없으면 전화번호로 기존 회원 찾아 연결 (계정 분리 방지)
    if (!user) {
      const { data: byPhone } = await sb
        .from("users")
        .select("id, name, phone, withdraw_scheduled_at")
        .eq("phone", profile.phone)
        .maybeSingle();
      if (byPhone) {
        await sb
          .from("users")
          .update({ kakao_id: profile.kakaoId })
          .eq("id", byPhone.id);
        user = byPhone;
      }
    }

    // 탈퇴 유예 처리 — 휴대폰 로그인과 동일한 규칙
    if (user?.withdraw_scheduled_at) {
      if (isPastDue(user.withdraw_scheduled_at)) {
        await purgeWithdrawnUser(sb, user.id);
        user = null;
      } else {
        return fail(
          `탈퇴 신청 상태입니다(${formatKoreanDate(
            user.withdraw_scheduled_at
          )} 삭제 예정). 휴대폰 번호로 로그인해 취소해 주세요.`
        );
      }
    }

    // 3) 기존 회원 — 바로 로그인
    if (user) {
      await sb
        .from("users")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", user.id);
      const token = await createSessionToken({
        uid: user.id,
        name: user.name,
        phone: user.phone,
      });
      const res = clearState(redirectTo(next));
      res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
      return res;
    }

    // 4) 신규 — 약관 동의를 받아야 하므로 바로 만들지 않고 가입 단계로 보낸다
    const signupToken = await signToken(
      { t: "signup", phone: profile.phone, kakaoId: profile.kakaoId },
      600
    );
    const qs = new URLSearchParams({ kakaoSignup: signupToken, next });
    if (profile.name) qs.set("kakaoName", profile.name);
    return clearState(redirectTo(`/login?${qs.toString()}`));
  } catch (e) {
    console.error("[auth/kakao/callback]", e);
    return fail("로그인 처리 중 오류가 발생했습니다.");
  }
}
