import type { SupabaseClient } from "@supabase/supabase-js";
import type { Category, Product, ProductDetail } from "@/types";

/**
 * 데이터 접근 레이어 (앱 재사용 가능)
 * - Supabase 클라이언트를 주입받는 순수 함수로 구성
 * - 나중에 React Native 앱에서 이 파일을 그대로 가져다 쓸 수 있음
 */

export async function getCategories(sb: SupabaseClient): Promise<Category[]> {
  const { data, error } = await sb
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function getProducts(
  sb: SupabaseClient,
  opts: { categorySlug?: string; featuredOnly?: boolean; limit?: number } = {}
): Promise<Product[]> {
  let q = sb
    .from("products")
    .select("*, category:categories!inner(name, slug)")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (opts.categorySlug) q = q.eq("category.slug", opts.categorySlug);
  if (opts.featuredOnly) q = q.eq("is_featured", true);
  if (opts.limit) q = q.limit(opts.limit);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Product[];
}

export async function getProductBySlug(
  sb: SupabaseClient,
  slug: string
): Promise<ProductDetail | null> {
  const { data: product, error } = await sb
    .from("products")
    .select(
      `*, category:categories(name, slug),
       images:product_images(*),
       boarding_points(*),
       itinerary:itinerary_items(*),
       reviews(*)`
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  if (!product) return null;

  const today = new Date().toISOString().slice(0, 10);
  const { data: departures, error: depErr } = await sb
    .from("departures")
    .select("*")
    .eq("product_id", product.id)
    .gte("departure_date", today)
    .order("departure_date");
  if (depErr) throw depErr;

  const sortByOrder = (a: { sort_order: number }, b: { sort_order: number }) =>
    a.sort_order - b.sort_order;

  return {
    ...product,
    includes: (product.includes ?? []) as string[],
    excludes: (product.excludes ?? []) as string[],
    optional_items: (product.optional_items ?? []) as string[],
    images: (product.images ?? []).sort(sortByOrder),
    boarding_points: (product.boarding_points ?? []).sort(sortByOrder),
    itinerary: (product.itinerary ?? []).sort(
      (a: any, b: any) => a.day_no - b.day_no || a.sort_order - b.sort_order
    ),
    reviews: (product.reviews ?? []).sort(
      (a: any, b: any) => (a.created_at < b.created_at ? 1 : -1)
    ),
    departures: departures ?? [],
  } as ProductDetail;
}

export async function getDeparture(sb: SupabaseClient, departureId: string) {
  const { data, error } = await sb
    .from("departures")
    .select("*, product:products(*)")
    .eq("id", departureId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
