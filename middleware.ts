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
