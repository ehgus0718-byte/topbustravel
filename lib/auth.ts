// 관리자 인증 토큰: SHA-256(ADMIN_PASSWORD + salt)
// Edge(middleware)와 Node(API route) 양쪽에서 동작하도록 Web Crypto 사용
const SALT = "topbustravel-admin-v1";

export async function adminToken(): Promise<string> {
  const data = new TextEncoder().encode((process.env.ADMIN_PASSWORD || "") + SALT);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const ADMIN_COOKIE = "tb_admin";
