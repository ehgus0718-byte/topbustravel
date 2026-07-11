import crypto from "crypto";

/**
 * 솔라피 SMS 발송 헬퍼 (서버 전용 — API Route/Server Action에서만 import)
 *
 * 필요 환경변수:
 *   SOLAPI_API_KEY
 *   SOLAPI_API_SECRET
 *   SOLAPI_SENDER   (발신번호, 숫자만: 예 0421234567)
 *
 * ※ 환경변수 이름이 AI SPACE에 등록된 실제 이름과 다르면 여기만 맞춰 수정.
 */

const SOLAPI_ENDPOINT = "https://api.solapi.com/messages/v4/send";

function buildAuthHeader(apiKey: string, apiSecret: string) {
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(16).toString("hex");
  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(date + salt)
    .digest("hex");
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

export interface SendSmsResult {
  ok: boolean;
  statusCode?: string;
  raw?: unknown;
  error?: string;
}

/**
 * 단건 SMS/LMS 발송. 본문이 한글 기준 45자(90바이트) 초과면 솔라피가 LMS로 자동 전환하도록 type 생략.
 * 발송 실패가 결제 흐름을 깨뜨리면 안 되므로, 호출부에서 반드시 try/catch 하거나
 * 반환값 ok만 확인하고 로그를 남길 것 (throw 하지 않음).
 */
export async function sendSms(to: string, text: string): Promise<SendSmsResult> {
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const from = process.env.SOLAPI_SENDER;

  if (!apiKey || !apiSecret || !from) {
    return { ok: false, error: "SOLAPI env vars missing" };
  }

  // 수신번호 정규화: 숫자만 남김 (010-1234-5678 → 01012345678)
  const toNormalized = to.replace(/[^0-9]/g, "");
  if (!toNormalized) {
    return { ok: false, error: `invalid phone: ${to}` };
  }

  try {
    const res = await fetch(SOLAPI_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: buildAuthHeader(apiKey, apiSecret),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          to: toNormalized,
          from: from.replace(/[^0-9]/g, ""),
          text,
        },
      }),
    });

    const data = await res.json().catch(() => null);

    // 솔라피 성공: HTTP 200 + groupInfo/statusCode 기반
    if (res.ok) {
      return { ok: true, raw: data };
    }
    return {
      ok: false,
      statusCode: String(res.status),
      raw: data,
      error: `solapi http ${res.status}`,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
