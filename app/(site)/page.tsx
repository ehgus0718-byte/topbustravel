import Link from "next/link";
import ProductCard from "@/components/product/ProductCard";
import HomePopup from "@/components/home/HomePopup";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCategories, getProducts } from "@/lib/api/products";
import { getActivePopups, type Popup } from "@/lib/api/popups";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const sb = createServerSupabase();
  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  let featured: Awaited<ReturnType<typeof getProducts>> = [];
  let latest: Awaited<ReturnType<typeof getProducts>> = [];
  try {
    [categories, featured, latest] = await Promise.all([
      getCategories(sb),
      getProducts(sb, { featuredOnly: true, limit: 6 }),
      getProducts(sb, { limit: 8 }),
    ]);
  } catch {
    // DB 미설정 시 빈 화면 유지
  }

  // 홈 팝업 — 실패해도 홈 렌더링에는 영향 없음
  let popups: Popup[] = [];
  try {
    popups = await getActivePopups(sb);
  } catch {}

  return (
    <div>
      {popups.length > 0 && <HomePopup popups={popups} />}

      {/* 히어로 */}
      <section className="relative overflow-hidden bg-primary text-white">
        <div className="relative mx-auto max-w-6xl px-5 pb-10 pt-9 md:px-6 md:pb-24 md:pt-20">
          <RouteDeco />
          <p className="relative text-[13px] font-semibold text-white/80 md:text-base">
            전세버스 국내여행 전문 여행사
          </p>
          <h1 className="relative mt-1.5 text-[26px] font-extrabold leading-tight md:mt-3 md:text-5xl">
            대전·세종에서 출발하는
            <br />
            가장 쉬운 버스여행
          </h1>
          <p className="relative mt-2.5 text-[14px] leading-relaxed text-white/85 md:mt-4 md:text-lg">
            집 근처 탑승지에서 타면, 나머지는 저희가 할게요.
          </p>
          <Link
            href="/products"
            className="relative mt-5 inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-[14px] font-bold text-primary transition hover:bg-white/90 active:scale-95 md:mt-8 md:px-6 md:py-3.5 md:text-base"
          >
            여행상품 둘러보기 →
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-6xl md:px-6">
        {/* 카테고리 */}
        {categories.length > 0 && (
          <section className="flex gap-2 overflow-x-auto px-4 py-4 no-scrollbar md:px-0 md:py-6">
            <Chip href="/products" label="전체" />
            {categories.map((c) => (
              <Chip key={c.id} href={`/products?category=${c.slug}`} label={c.name} />
            ))}
          </section>
        )}

        {/* 추천 상품 */}
        {featured.length > 0 && (
          <section className="pt-2 md:pt-4">
            <SectionTitle title="이번 주 추천 여행" href="/products" />
            <div className="flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0">
              {featured.map((p) => (
                <ProductCard key={p.id} product={p} horizontal />
              ))}
            </div>
          </section>
        )}

        {/* 전체 상품 */}
        <section className="pb-8 pt-4 md:pb-16 md:pt-8">
          <SectionTitle title="대전·세종 출발 국내 여행상품" href="/products" />
          {latest.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-faint md:px-0">
              등록된 상품이 없습니다. 관리자 페이지에서 상품을 등록해 주세요.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-6 px-4 sm:grid-cols-2 md:px-0 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-10">
              {latest.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>

        {/* 소개문 (SEO) */}
        <section className="border-t border-line px-4 pb-10 pt-8 md:px-0 md:pb-16 md:pt-10">
          <h2 className="text-[16px] font-extrabold md:text-lg">
            탑버스트래블이 준비하는 버스여행
          </h2>
          <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-sub md:text-[14px]">
            탑버스트래블은 대전과 세종, 충청권에서 출발하는 전세버스 여행 전문
            여행사입니다. 서산·당진 같은 서해안 당일여행부터 강원도·남도 1박2일
            코스, 벚꽃과 단풍 시즌 테마여행까지 — 코스 설계, 차량, 기사님, 식사
            예약을 한 번에 준비해 드립니다. 가족여행과 효도여행은 물론 학교 MT,
            기업 워크숍 같은{" "}
            <Link href="/contact" className="font-semibold text-primary underline-offset-2 hover:underline">
              단체여행 견적
            </Link>
            도 상담해 드립니다. 집 근처 탑승지에서 편하게 타고, 여행만 즐기다
            오세요.
          </p>
        </section>
      </div>
    </div>
  );
}

function SectionTitle({ title, href }: { title: string; href: string }) {
  return (
    <div className="mb-3 flex items-center justify-between px-4 md:mb-5 md:px-0">
      <h2 className="text-[18px] font-extrabold md:text-2xl">{title}</h2>
      <Link
        href={href}
        className="text-[13px] font-medium text-faint transition hover:text-sub md:text-sm"
      >
        전체보기
      </Link>
    </div>
  );
}

function Chip({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="shrink-0 rounded-full border border-line bg-white px-3.5 py-1.5 text-[13px] font-semibold text-sub transition hover:border-primary hover:text-primary active:bg-canvas md:px-4 md:py-2 md:text-sm"
    >
      {label}
    </Link>
  );
}

/* 히어로 배경: 버스 노선 모티프 */
function RouteDeco() {
  return (
    <svg
      className="pointer-events-none absolute -right-6 -top-2 h-44 w-64 opacity-25 md:-top-6 md:right-0 md:h-80 md:w-[480px]"
      viewBox="0 0 260 180"
      fill="none"
      aria-hidden
    >
      <path
        d="M-10 150 C 60 150, 60 60, 130 60 S 210 130, 280 90"
        stroke="white"
        strokeWidth="3"
        strokeDasharray="1 10"
        strokeLinecap="round"
      />
      <circle cx="130" cy="60" r="7" fill="white" />
      <circle cx="130" cy="60" r="13" stroke="white" strokeWidth="2" />
      <circle cx="230" cy="103" r="5" fill="white" />
    </svg>
  );
}
