/**
 * 솔라피(SOLAPI) SMS 발송
 * 필요 환경변수: SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_SENDER(등록된 발신번호)
 * 키가 없으면 개발 폴백: 서버 콘솔에 메시지 출력 (실발송 없음)
 */

async function hmacSha256Hex(key: string, data: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(data)
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function sendSms(to: string, text: string): Promise<void> {
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const from = process.env.SOLAPI_SENDER;

  if (!apiKey || !apiSecret || !from) {
    // 개발/키 미설정 폴백 — 실발송 없이 서버 로그로만 확인
    console.log(`[sms:dev] to=${to} text=${text}`);
    return;
  }

  const date = new Date().toISOString();
  const salt = crypto.randomUUID();
  const signature = await hmacSha256Hex(apiSecret, date + salt);

  const res = await fetch("https://api.solapi.com/messages/v4/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`,
    },
    body: JSON.stringify({
      message: { to, from, text },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[sms] solapi send failed", res.status, body);
    throw new Error("SMS 발송에 실패했습니다.");
  }
}
