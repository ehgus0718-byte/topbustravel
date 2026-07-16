"use client";
import { usePathname } from "next/navigation";
import type { FloatingButton } from "@/lib/api/floating";

/**
 * 플로팅 링크 버튼 — 화면 오른쪽 아래에 세로로 떠 있는 원형 버튼 (최대 3개)
 * - 관리자 > 팝업 > 플로팅 버튼에서 이름/링크/아이콘/새창/순서/공개 관리
 * - PC: 마우스 올리면 왼쪽으로 이름 라벨 표시 / 모바일: 원형 아이콘만
 * - 상품 상세·예약 페이지는 하단 고정 예약 버튼과 겹치므로 표시하지 않음
 * - 외부 링크(새 창)는 rel="noopener noreferrer" 적용, 키보드 포커스 링 지원
 */
export default function FloatingLinks({ buttons }: { buttons: FloatingButton[] }) {
  const pathname = usePathname();
  if (pathname.startsWith("/products/") || pathname.startsWith("/reserve")) return null;
  if (!buttons || buttons.length === 0) return null;

  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+76px)] right-4 z-50 flex flex-col items-end gap-2.5 md:bottom-8 md:right-6">
      {buttons.slice(0, 3).map((b) => {
        const external = /^https?:\/\//i.test(b.link_url);
        const linkProps = b.new_tab
          ? { target: "_blank", rel: "noopener noreferrer" }
          : external
            ? { rel: "noopener noreferrer" }
            : {};
        return (
          <a
            key={b.id}
            href={b.link_url}
            aria-label={b.label}
            {...linkProps}
            className="group relative flex items-center outline-none"
          >
            {/* PC 호버/포커스 시 이름 라벨 */}
            <span className="pointer-events-none absolute right-full mr-2.5 hidden whitespace-nowrap rounded-full bg-ink px-3 py-1.5 text-[12px] font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 md:block">
              {b.label}
            </span>
            {/* 원형 버튼 */}
            <span className="flex h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-full border border-line bg-white shadow-[0_6px_20px_rgba(25,31,40,0.16)] transition duration-150 group-hover:-translate-y-0.5 group-hover:shadow-[0_10px_26px_rgba(25,31,40,0.22)] group-focus-visible:ring-2 group-focus-visible:ring-primary group-focus-visible:ring-offset-2 group-active:scale-95 motion-reduce:transition-none">
              {b.icon_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={b.icon_url}
                  alt=""
                  draggable={false}
                  className="h-8 w-8 object-contain"
                />
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary"
                  aria-hidden
                >
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              )}
            </span>
          </a>
        );
      })}
    </div>
  );
}
