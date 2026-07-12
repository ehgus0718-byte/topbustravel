import crypto from "crypto";

/**
 * lib/nicepay.ts — 나이스페이 구모듈(웹표준 결제창) 서버 헬퍼
 *
 * 환경변수 (기존 등록값 그대로 사용):
 *   NICEPAY_CLIENT_ID  = MID (상점 아이디, 예: somangt01m)
 *   NICEPAY_SECRET_KEY = 상점키 (KEY관리의 "결제시 암호화 Key", ==로 끝나는 88자)
 *
 * ※ 이름이 CLIENT_ID/SECRET_KEY지만 구모듈에서는 MID/상점키를 담는다.
 *   (신모듈 전환 이력 때문에 이름이 이렇게 남음 — 값만 정확하면 동작에 문제 없음)
 *
 * 서명 규칙 (대전빵버스 nicepay-return v17에서 검증됨):
 *   인증(결제창 호출)용: sha256hex(EdiDate + MID + Amt + 상점키)
 *   승인(NextAppURL)용:  sha256hex(AuthToken + MID + Amt + EdiDate + 상점키)
 */

export const NICEPAY_MID = process.env.NICEPAY_CLIENT_ID || "";
export const NICEPAY_MERCHANT_KEY = process.env.NICEPAY_SECRET_KEY || "";

export function sha256hex(str: string): string {
  return crypto.createHash("sha256").update(str, "utf8").digest("hex");
}

/** 나이스페이 EdiDate 포맷: YYYYMMDDHHMMSS (KST 기준 서버 시간) */
export function getEdiDate(): string {
  const now = new Date();
  // 컨테이너가 UTC일 수 있으므로 KST(+9)로 보정
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${kst.getUTCFullYear()}${p(kst.getUTCMonth() + 1)}${p(kst.getUTCDate())}` +
    `${p(kst.getUTCHours())}${p(kst.getUTCMinutes())}${p(kst.getUTCSeconds())}`
  );
}

/** 인증(결제창 호출)용 SignData */
export function buildAuthSign(ediDate: string, amt: string): string {
  return sha256hex(ediDate + NICEPAY_MID + amt + NICEPAY_MERCHANT_KEY);
}

/** 승인(NextAppURL 호출)용 SignData */
export function buildApproveSign(authToken: string, amt: string, ediDate: string): string {
  return sha256hex(authToken + NICEPAY_MID + amt + ediDate + NICEPAY_MERCHANT_KEY);
}

/** application/x-www-form-urlencoded 본문 생성 */
export function buildFormBody(p: Record<string, string>): string {
  return Object.entries(p)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}
