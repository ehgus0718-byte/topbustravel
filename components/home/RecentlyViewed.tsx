"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import ProductCard from "@/components/product/ProductCard";
import type { Product } from "@/types";

const KEY = "tb_recently_viewed";

/** 최근 본 상품 — 기록이 없으면 섹션 자체를 렌더링하지 않음 (레이아웃 흔들림 없음) */
export default function RecentlyViewed() {
  const [items, setItems] = useState<Product[] | null>(null);

  useEffect(() => {
    let ids: string[] = [];
    try {
      const raw = localStorage.getItem(KEY);
      ids = raw ? JSON.parse(raw) : [];
    } catch {}
    if (ids.length === 0) {
      setItems([]);
      return;
    }
    fetch(`/api/products/by-ids?ids=${ids.join(",")}`)
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]));
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <section className="pt-6 md:pt-8">
      <div className="mb-3 flex items-center justify-between px-4 md:mb-5 md:px-0">
        <h2 className="text-[18px] font-extrabold md:text-2xl">최근 본 여행</h2>
        <Link
          href="/products"
          className="text-[13px] font-medium text-faint transition hover:text-sub md:text-sm"
        >
          전체보기
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar md:grid md:grid-cols-4 md:gap-6 md:overflow-visible md:px-0">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} horizontal />
        ))}
      </div>
    </section>
  );
}
