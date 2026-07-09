import Link from "next/link";
import ProductCard from "@/components/product/ProductCard";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCategories, getProducts } from "@/lib/api/products";

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

  return (
    <div>
      {/* 히어로 */}
      <section className="relative overflow-hidden bg-primary px-5 pb-10 pt-9 text-white">
        <RouteDeco />
        <p className="relative text-[13px] font-semibold text-white/80">
          전세버스 국내여행 전문
        </p>
        <h1 className="relative mt-1.5 text-[26px] font-extrabold leading-tight">
          버스 타고 떠나는
          <br />
          가장 쉬운 여행
        </h1>
        <p className="relative mt-2.5 text-[14px] leading-relaxed text-white/85">
          집 근처 탑승지에서 타면, 나머지는 저희가 할게요.
        </p>
        <Link
          href="/products"
          className="relative mt-5 inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-[14px] font-bold text-primary active:scale-95 transition"
        >
          여행상품 둘러보기 →
        </Link>
      </section>

      {/* 카테고리 */}
      {categories.length > 0 && (
        <section className="flex gap-2 overflow-x-auto px-4 py-4 no-scrollbar">
          <Chip href="/products" label="전체" />
          {categories.map((c) => (
            <Chip key={c.id} href={`/products?category=${c.slug}`} label={c.name} />
          ))}
        </section>
      )}

      {/* 추천 상품 */}
      {featured.length > 0 && (
        <section className="pt-2">
          <SectionTitle title="이번 주 추천 여행" href="/products" />
          <div className="flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} horizontal />
            ))}
          </div>
        </section>
      )}

      {/* 전체 상품 */}
      <section className="pb-8 pt-4">
        <SectionTitle title="여행상품" href="/products" />
        {latest.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-faint">
            등록된 상품이 없습니다. 관리자 페이지에서 상품을 등록해 주세요.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 px-4">
            {latest.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SectionTitle({ title, href }: { title: string; href: string }) {
  return (
    <div className="mb-3 flex items-center justify-between px-4">
      <h2 className="text-[18px] font-extrabold">{title}</h2>
      <Link href={href} className="text-[13px] font-medium text-faint">
        전체보기
      </Link>
    </div>
  );
}

function Chip({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="shrink-0 rounded-full border border-line bg-white px-3.5 py-1.5 text-[13px] font-semibold text-sub active:bg-canvas"
    >
      {label}
    </Link>
  );
}

/* 히어로 배경: 버스 노선 모티프 */
function RouteDeco() {
  return (
    <svg
      className="absolute -right-6 -top-2 h-44 w-64 opacity-25"
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
