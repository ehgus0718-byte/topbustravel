"use client";
import { useEffect } from "react";

const KEY = "tb_recently_viewed";
const MAX = 10;

/** 화면에 아무것도 그리지 않음. 상품 상세 진입 시 최근 본 상품 기록만 남김 */
export default function ViewTracker({ productId }: { productId: string }) {
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      const next = [productId, ...list.filter((id) => id !== productId)].slice(0, MAX);
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  }, [productId]);

  return null;
}
