import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "탑버스트래블 | 대전·세종 출발 국내여행 전문 전세버스 여행사",
    template: "%s | 탑버스트래블",
  },
  description:
    "대전·세종·충청권에서 출발하는 당일여행과 1박2일 버스여행. 벚꽃·단풍·온천 테마여행부터 효도여행, 가족여행, 기업 워크숍 단체여행까지. 집 근처 탑승지에서 타면 나머지는 탑버스트래블이 준비합니다.",
  keywords: [
    "대전 출발 여행",
    "세종 출발 여행",
    "충청권 전세버스",
    "국내여행",
    "당일여행",
    "1박2일여행",
    "버스여행",
    "단체여행",
    "효도여행",
    "테마여행",
  ],
  alternates: {
    // 각 페이지의 현재 경로를 canonical로 (metadataBase 기준 상대 해석)
    canonical: "./",
  },
  verification: {
    other: {
      "naver-site-verification": "99a25b0370da6bc93f94749a619c1b346317bd31",
    },
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "탑버스트래블",
    title: "탑버스트래블 - 대전·세종 출발 전세버스 국내여행",
    description:
      "집 근처 탑승지에서 타면 끝. 당일여행, 1박2일, 테마여행을 버스 한 대로 편하게 다녀오세요.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary",
    title: "탑버스트래블 - 대전·세종 출발 전세버스 국내여행",
    description:
      "당일여행부터 1박2일까지, 집 근처 탑승지에서 시작하는 편한 버스여행.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2b5ce6",
};

// TravelAgency는 LocalBusiness의 하위 타입 — 하나로 통합해 중복 신호 방지
const agencyJsonLd = {
  "@context": "https://schema.org",
  "@type": "TravelAgency",
  "@id": `${SITE_URL}/#agency`,
  name: "탑버스트래블",
  alternateName: "topBustravel",
  legalName: "소망투어",
  url: SITE_URL,
  description:
    "대전·세종·충청권 출발 전세버스 국내여행 전문 여행사. 당일여행, 1박2일, 테마여행, 단체여행 견적.",
  telephone: "+82-10-4797-0718",
  email: "ehgus0718@naver.com",
  taxID: "781-69-00237",
  address: {
    "@type": "PostalAddress",
    addressCountry: "KR",
    addressRegion: "대전광역시",
    addressLocality: "서구",
    streetAddress: "청사서로 29",
  },
  areaServed: ["대전", "세종", "충남", "충북"],
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "09:00",
    closes: "18:00",
  },
  priceRange: "₩₩",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(agencyJsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
