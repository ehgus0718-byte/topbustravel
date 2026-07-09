import Link from "next/link";
import ProductCard from "@/components/product/ProductCard";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCategories, getProducts } from "@/lib/api/products";

export const dynamic = "force-dynamic";

export const metadata = { title: "여행상품" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const sb = createServerSupabase();

  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  let products: Awaited<ReturnType<typeof getProducts>> = [];
  try {
    [categories, products] = await Promise.all([
      getCategories(sb),
      getProducts(sb, { categorySlug: category }),
    ]);
  } catch {}

  return (
    <div className="pb-8">
      <div className="px-4 pt-5">
        <h1 className="text-[22px] font-extrabold">여행상품</h1>
      </div>

      <div className="sticky top-14 z-30 flex gap-2 overflow-x-auto bg-white px-4 py-3 no-scrollbar">
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
        <p className="px-4 py-16 text-center text-sm text-faint">
          해당 카테고리에 상품이 없습니다.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 px-4 pt-2">
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
      className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition ${
        active ? "bg-ink text-white" : "border border-line bg-white text-sub"
      }`}
    >
      {label}
    </Link>
  );
}
