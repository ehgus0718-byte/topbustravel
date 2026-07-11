import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "topBustravel — 버스 타고 떠나는 가장 쉬운 여행",
    template: "%s | topBustravel",
  },
  description:
    "전세버스 국내 여행 전문 topBustravel. 당일여행부터 1박2일까지, 탑승지 선택하고 간편하게 예약하세요.",
  verification: {
    other: {
      "naver-site-verification": "99a25b0370da6bc93f94749a619c1b346317bd31",
    },
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "topBustravel",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2b5ce6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="preconnect"
          href="https://cdn.jsdelivr.net"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
