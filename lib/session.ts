import { cookies } from "next/headers";

/**
 * 회원 세션: HMAC-SHA256 서명 토큰을 httpOnly 쿠키로 보관 (30일)
 * 토큰 = base64url(payload JSON) + "." + HMAC서명
 * 관리자 인증(lib/auth.ts, tb_admin)과 동일한 Web Crypto 방식
 */

export const SESSION_COOKIE = "tb_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30일

export type SessionUser = { uid: string; name: string; phone: string };

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET 환경변수가 없습니다.");
  return s;
}

async function hmacHex(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function b64urlEncode(s: string): string {
  return Buffer.from(s, "utf8").toString("base64url");
}
function b64urlDecode(s: string): string {
  return Buffer.from(s, "base64url").toString("utf8");
}

/** payload에 exp(초 단위 unix time)를 더해 서명 토큰 생성 */
export async function signToken(
  payload: Record<string, unknown>,
  ttlSeconds: number
): Promise<string> {
  const body = b64urlEncode(
    JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds })
  );
  const sig = await hmacHex(body);
  return `${body}.${sig}`;
}

/** 토큰 검증. 서명 불일치/만료 시 null */
export async function verifyToken<T = Record<string, unknown>>(
  token: string | undefined | null
): Promise<(T & { exp: number }) | null> {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  try {
    const expected = await hmacHex(body);
    if (sig !== expected) return null;
    const payload = JSON.parse(b64urlDecode(body));
    if (typeof payload.exp !== "number" || payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

/** 서버 컴포넌트/서버 액션에서 현재 로그인 사용자 조회 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const payload = await verifyToken<SessionUser & { t: string }>(
    store.get(SESSION_COOKIE)?.value
  );
  if (!payload || payload.t !== "session") return null;
  return { uid: payload.uid, name: payload.name, phone: payload.phone };
}

/** 세션 토큰 생성 (라우트 핸들러에서 쿠키로 설정) */
export async function createSessionToken(user: SessionUser): Promise<string> {
  return signToken({ t: "session", ...user }, SESSION_MAX_AGE);
}

export const sessionCookieOptions = {
  httpOnly: true as const,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE,
};
