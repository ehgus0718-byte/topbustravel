/** 암호학적 난수 기반 6자리 인증번호 생성 */
export function generateOtpCode(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0] % 1000000).padStart(6, "0");
}

/** SHA-256 hex (인증번호는 해시로만 DB 저장) */
export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input)
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** 전화번호 정규화: 숫자만, 010XXXXXXXX 형식 검증. 유효하지 않으면 null */
export function normalizePhone(raw: string): string | null {
  const digits = (raw || "").replace(/\D/g, "");
  if (!/^01[016789]\d{7,8}$/.test(digits)) return null;
  return digits;
}

export const OTP_TTL_SECONDS = 180; // 인증번호 유효 3분
export const OTP_RESEND_COOLDOWN = 60; // 같은 번호 재발송 쿨다운(초)
export const OTP_DAILY_LIMIT_PHONE = 5; // 번호당 하루 발송 한도
export const OTP_DAILY_LIMIT_IP = 20; // IP당 하루 발송 한도
export const OTP_MAX_ATTEMPTS = 5; // 인증번호당 검증 시도 한도
