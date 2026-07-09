import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import { getProductBySlug } from "@/lib/api/products";
import { getSettings } from "@/lib/api/settings";
import DetailClient from "@/components/product/DetailClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await getProductBySlug(createServerSupabase(), slug);
    if (!product) return {};
    return {
      title: product.title,
      description: product.summary ?? undefined,
      openGraph: {
        title: product.title,
        description: product.summary ?? undefined,
        images: product.thumbnail_url ? [product.thumbnail_url] : undefined,
      },
    };
  } catch {
    return {};
  }
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const sb = createServerSupabase();

  let product = null;
  let settings: Record<string, string> = {};
  try {
    [product, settings] = await Promise.all([
      getProductBySlug(sb, slug),
      getSettings(sb),
    ]);
  } catch {}

  if (!product) notFound();

  // SEO: 상품 구조화 데이터
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.summary ?? product.title,
    image: product.images.map((i) => i.image_url),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "KRW",
      lowPrice: product.base_price,
      availability: "https://schema.org/InStock",
    },
    ...(product.reviews.length > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: (
          product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length
        ).toFixed(1),
        reviewCount: product.reviews.length,
      },
    }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DetailClient
        product={product}
        tel={settings.tel || "042-000-0000"}
        kakaoUrl={settings.kakao_url || "#"}
      />
    </>
  );
}
