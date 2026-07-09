import type { MetadataRoute } from "next";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const sb = createServerSupabase();

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.5 },
  ];

  try {
    const { data } = await sb
      .from("products")
      .select("slug, updated_at")
      .eq("is_active", true);
    const productPages: MetadataRoute.Sitemap = (data ?? []).map((p) => ({
      url: `${base}/products/${p.slug}`,
      lastModified: p.updated_at,
      changeFrequency: "weekly",
      priority: 0.8,
    }));
    return [...staticPages, ...productPages];
  } catch {
    return staticPages;
  }
}
