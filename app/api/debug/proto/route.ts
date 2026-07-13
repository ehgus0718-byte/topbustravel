import { type NextRequest, NextResponse } from "next/server";

// 임시 진단 라우트 (HTTPS 강제 적용 검증용 — 검증 완료 후 삭제 예정)
// 프록시가 앱에 어떤 프로토콜 정보를 전달하는지 확인한다.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return NextResponse.json({
    xForwardedProto: req.headers.get("x-forwarded-proto"),
    xForwardedHost: req.headers.get("x-forwarded-host"),
    host: req.headers.get("host"),
    forceHttpsEnabled: process.env.FORCE_HTTPS === "1",
    nodeEnv: process.env.NODE_ENV,
    time: new Date().toISOString(),
  });
}
