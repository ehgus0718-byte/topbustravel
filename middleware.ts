import { NextResponse, type NextRequest } from "next/server";
import { adminToken, ADMIN_COOKIE } from "@/lib/auth";

const CANONICAL_HOST = "topbustravel.com";
const REDIRECT_HOSTS = new Set([
  "topbustour.com",
  "www.topbustour.com",
  "www.topbustravel.com",
]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 보조 도메인 → 대표 도메인 301 영구 리다이렉트 (SEO 신호 합산)
  const host = (req.headers.get("host") || "").split(":")[0].toLowerCase();
  if (REDIRECT_HOSTS.has(host)) {
    const url = req.nextUrl.clone();
    url.protocol = "https:";
    url.host = CANONICAL_HOST;
    url.port = "";
    return NextResponse.redirect(url, 301);
  }

  // HTTP → HTTPS 강제 리다이렉트
  // 환경변수 FORCE_HTTPS=1 일 때만 동작. (문제 발생 시 환경변수 삭제만으로 즉시 원복)
  // x-forwarded-proto는 프록시에 따라 "https,http"처럼 콤마로 올 수 있어 첫 값만 사용.
  // 헤더가 없으면 판단 불가이므로 리다이렉트하지 않음 (무한 루프 방어).
  if (process.env.FORCE_HTTPS === "1") {
    const proto = (req.headers.get("x-forwarded-proto") || "")
      .split(",")[0]
      .trim()
      .toLowerCase();
    if (proto === "http" && host) {
      const url = req.nextUrl.clone();
      url.protocol = "https:";
      url.host = host;
      url.port = "";
      return NextResponse.redirect(url, 301);
    }
  }

  // 관리자 영역 인증
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    // 로그인 페이지/API는 통과
    if (pathname === "/admin/login" || pathname === "/api/admin/login") {
      return NextResponse.next();
    }

    const token = req.cookies.get(ADMIN_COOKIE)?.value;
    const expected = await adminToken();

    if (token !== expected) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // 정적 리소스 제외 전체 경로 (도메인 리다이렉트용)
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
