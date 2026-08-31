/**
 * 카카오 로그인 (REST API / 인가 코드 방식)
 * 환경변수: KAKAO_REST_API_KEY, KAKAO_CLIENT_SECRET, KAKAO_REDIRECT_URI
 */

export const KAKAO_STATE_COOKIE = "tb_kakao_state";

export function kakaoConfig() {
  const clientId = process.env.KAKAO_REST_API_KEY;
  const redirectUri = process.env.KAKAO_REDIRECT_URI;
  const clientSecret = process.env.KAKAO_CLIENT_SECRET;
  if (!clientId || !redirectUri) return null;
  return { clientId, redirectUri, clientSecret };
}

/**
 * 카카오가 주는 전화번호는 "+82 10-1234-5678" 형태.
 * 국내 번호만 010XXXXXXXX 로 변환하고, 그 외(해외번호·빈값)는 null.
 */
export function normalizeKakaoPhone(raw?: string | null): string | null {
  if (!raw) return null;
  const compact = raw.replace(/[\s-]/g, "");
  let digits: string;
  if (compact.startsWith("+82")) {
    digits = "0" + compact.slice(3).replace(/^0+/, "");
  } else if (compact.startsWith("82") && !compact.startsWith("820")) {
    digits = "0" + compact.slice(2);
  } else {
    digits = compact.replace(/\D/g, "");
  }
  return /^01[016789]\d{7,8}$/.test(digits) ? digits : null;
}

export type KakaoProfile = {
  kakaoId: string;
  name: string | null;
  phone: string | null;
};

/** 인가 코드 → 액세스 토큰 */
export async function exchangeCodeForToken(code: string): Promise<string | null> {
  const cfg = kakaoConfig();
  if (!cfg) return null;

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    code,
  });
  if (cfg.clientSecret) body.set("client_secret", cfg.clientSecret);

  const res = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body,
    cache: "no-store",
  });
  if (!res.ok) {
    console.error("[kakao/token]", res.status, await res.text().catch(() => ""));
    return null;
  }
  const data = await res.json();
  return data.access_token ?? null;
}

/** 액세스 토큰 → 사용자 정보 */
export async function fetchKakaoProfile(accessToken: string): Promise<KakaoProfile | null> {
  const res = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) {
    console.error("[kakao/me]", res.status, await res.text().catch(() => ""));
    return null;
  }
  const data = await res.json();
  const account = data?.kakao_account ?? {};
  return {
    kakaoId: String(data?.id ?? ""),
    name: (account.name ?? "").toString().trim() || null,
    phone: normalizeKakaoPhone(account.phone_number),
  };
}

/** 로그인 실패 시 되돌려보낼 주소 */
export function loginErrorUrl(origin: string, message: string, next?: string) {
  const u = new URL("/login", origin);
  u.searchParams.set("kakaoError", message);
  if (next && next.startsWith("/")) u.searchParams.set("next", next);
  return u.toString();
}
