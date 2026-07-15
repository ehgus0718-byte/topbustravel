"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AdminNav from "../AdminNav";
import { won } from "@/lib/format";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);

  const load = () =>
    fetch("/api/admin/products")
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []));

  useEffect(() => {
    load();
  }, []);

  const toggle = async (p: any) => {
    await fetch(`/api/admin/products/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !p.is_active }),
    });
    load();
  };

  return (
    <div>
      <AdminNav />
      <div className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-[17px] font-extrabold">상품 관리</h1>
          <Link
            href="/admin/products/new"
            className="rounded-xl bg-primary px-3.5 py-2 text-[13px] font-bold text-white"
          >
            + 새 상품
          </Link>
        </div>
        <div className="space-y-2">
          {products.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-line p-3"
            >
              <Link href={`/admin/products/${p.id}`} className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-bold">
                  {p.title}
                  {p.is_featured && <span className="ml-1.5 text-[11px] text-accent">추천</span>}
                </p>
                <p className="text-[12px] text-faint">
                  {p.product_code && (
                    <span className="mr-1.5 font-semibold text-sub">{p.product_code}</span>
                  )}
                  {p.category?.name ?? "-"} · {p.duration_text} · {won(p.base_price)}
                </p>
              </Link>
              <button
                onClick={() => toggle(p)}
                className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[12px] font-bold ${
                  p.is_active ? "bg-primary-soft text-primary" : "bg-canvas text-faint"
                }`}
              >
                {p.is_active ? "판매중" : "숨김"}
              </button>
            </div>
          ))}
          {products.length === 0 && (
            <p className="py-10 text-center text-sm text-faint">
              등록된 상품이 없습니다. 새 상품을 등록해 보세요.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
