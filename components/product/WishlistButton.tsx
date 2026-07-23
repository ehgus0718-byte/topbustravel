"use client";
import { useRouter, usePathname } from "next/navigation";
import { useWishlist } from "./WishlistProvider";

/**
 * 찜 하트 버튼 — 카드 우측 상단.
 * 터치 타깃 40x40 확보(시각적으로는 작게), 색상 전환만(스케일/바운스 없음),
 * 예약 버튼(primary 배경)보다 눈에 띄지 않도록 흰 배경 + 아웃라인 하트로 절제.
 */
export default function WishlistButton({ productId }: { productId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { ids, toggle, loggedIn } = useWishlist();
  const saved = ids.has(productId);

  return (
    <button
      type="button"
      aria-label={saved ? "찜 해제" : "찜하기"}
      aria-pressed={saved}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!loggedIn) {
          router.push(`/login?next=${encodeURIComponent(pathname)}`);
          return;
        }
        await toggle(productId);
      }}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/85 backdrop-blur-sm transition hover:bg-white"
    >
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`transition-colors duration-200 ${saved ? "text-accent" : "text-sub"}`}
        aria-hidden
      >
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
      </svg>
    </button>
  );
}
