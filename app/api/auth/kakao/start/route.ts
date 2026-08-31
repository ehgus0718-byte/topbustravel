import { NextResponse } from "next/server";
import { kakaoConfig, KAKAO_STATE_COOKIE, loginErrorPath } from "@/lib/kakao";

/** GET /api/auth/kakao/start?next=/my — 카카오 동의 화면으로 이동 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const rawNext = url.searchParams.get("next") || "/my";
  const next = rawNext.startsWith("/") ? rawNext : "/my";

  const cfg = kakaoConfig();
  if (!cfg) {
    console.error("[kakao/start] 환경변수 누락");
    return new NextResponse(null, {
      status: 303,
      headers: {
        Location: loginErrorPath("카카오 로그인이 아직 준비되지 않았습니다.", next),
      },
    });
  }

  // CSRF 방지용 state — 쿠키에 담고 콜백에서 대조
  const state = crypto.randomUUID();

  const authorize = new URL("https://kauth.kakao.com/oauth/authorize");
  authorize.searchParams.set("client_id", cfg.clientId);
  authorize.searchParams.set("redirect_uri", cfg.redirectUri);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("state", state);

  const res = NextResponse.redirect(authorize.toString());
  res.cookies.set(KAKAO_STATE_COOKIE, `${state}|${next}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
