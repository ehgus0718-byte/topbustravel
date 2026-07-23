import Link from "next/link";
import ProductCard from "@/components/product/ProductCard";
import SearchBar from "@/components/home/SearchBar";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCategories, getProducts } from "@/lib/api/products";

export const dynamic = "force-dynamic";

export const metadata = { title: "여행상품" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { category, q } = await searchParams;
  const sb = createServerSupabase();

  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  let products: Awaited<ReturnType<typeof getProducts>> = [];
  try {
    [categories, products] = await Promise.all([
      getCategories(sb),
      getProducts(sb, { categorySlug: category, q }),
    ]);
  } catch {}

  return (
    <div className="mx-auto max-w-6xl pb-8 md:px-6 md:pb-20">
      <div className="px-4 pt-5 md:px-0 md:pt-10">
        <h1 className="text-[22px] font-extrabold md:text-3xl">
          {q ? `‘${q}’ 검색 결과` : "여행상품"}
        </h1>
        <div className="mt-3">
          <SearchBar />
        </div>
      </div>

      <div className="sticky top-14 z-30 flex gap-2 overflow-x-auto bg-white px-4 py-3 no-scrollbar md:top-16 md:px-0 md:py-4">
        <Tab href="/products" label="전체" active={!category} />
        {categories.map((c) => (
          <Tab
            key={c.id}
            href={`/products?category=${c.slug}`}
            label={c.name}
            active={category === c.slug}
          />
        ))}
      </div>

      {products.length === 0 ? (
        <p className="px-4 py-16 text-center text-sm text-faint md:px-0">
          {q ? "검색 결과가 없습니다. 다른 키워드로 찾아보세요." : "해당 카테고리에 상품이 없습니다."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 px-4 pt-2 sm:grid-cols-2 md:px-0 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-10 xl:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function Tab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition md:px-4 md:py-2 md:text-sm ${
        active
          ? "bg-ink text-white"
          : "border border-line bg-white text-sub hover:border-primary hover:text-primary"
      }`}
    >
      {label}
    </Link>
  );
}
