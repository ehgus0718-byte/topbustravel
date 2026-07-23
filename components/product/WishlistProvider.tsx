"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type WishlistCtx = {
  ids: Set<string>;
  ready: boolean;
  loggedIn: boolean;
  toggle: (productId: string) => Promise<"added" | "removed" | "unauthorized">;
};

const Ctx = createContext<WishlistCtx | null>(null);

export function WishlistProvider({
  loggedIn,
  children,
}: {
  loggedIn: boolean;
  children: ReactNode;
}) {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(!loggedIn);

  useEffect(() => {
    if (!loggedIn) return;
    fetch("/api/wishlist")
      .then((r) => r.json())
      .then((d) => setIds(new Set<string>(d.ids ?? [])))
      .catch(() => {})
      .finally(() => setReady(true));
  }, [loggedIn]);

  const toggle = async (productId: string) => {
    if (!loggedIn) return "unauthorized" as const;
    const has = ids.has(productId);
    // 낙관적 업데이트 — 서버 응답 기다리지 않고 즉시 색상 반영
    setIds((prev) => {
      const next = new Set(prev);
      has ? next.delete(productId) : next.add(productId);
      return next;
    });
    try {
      if (has) {
        await fetch(`/api/wishlist?product_id=${productId}`, { method: "DELETE" });
      } else {
        await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product_id: productId }),
        });
      }
      return (has ? "removed" : "added") as const;
    } catch {
      // 실패 시 되돌림
      setIds((prev) => {
        const next = new Set(prev);
        has ? next.add(productId) : next.delete(productId);
        return next;
      });
      return (has ? "added" : "removed") as const;
    }
  };

  return <Ctx.Provider value={{ ids, ready, loggedIn, toggle }}>{children}</Ctx.Provider>;
}

export function useWishlist() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
