"use client";
import { useEffect, useRef, useState } from "react";
import type { ItineraryItem } from "@/types";

/**
 * 버스 노선도 스타일 여행일정 타임라인 (사진 카드 확장판)
 * — topBustravel의 시그니처 UI: 정류장 도트 + 파란 노선 라인
 * — 일정 항목에 사진(image_urls)이 있으면 감성 사진 카드가 함께 표시된다.
 *   사진이 없는 항목은 기존과 동일하게 텍스트만 표시 (하위 호환).
 * — 스크롤 시 부드럽게 나타나고, 사진에 마우스를 올리면 살짝 확대된다.
 * — 아이콘은 외부 패키지(lucide 등) 없이 인라인 SVG로 구현 (배포 안정성 우선)
 */

function ClockIcon({ size = 12, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}
function MapPinIcon({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

/** 스크롤 진입 시 나타나는 래퍼 (IntersectionObserver, 라이브러리 불필요) */
function Reveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out motion-reduce:transition-none ${
        shown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
    >
      {children}
    </div>
  );
}

/** 관광지 사진 카드 — 사진 수에 따라 1~2열 자동 배치, 호버 시 살짝 확대 */
function PhotoCard({ item }: { item: ItineraryItem }) {
  const photos = (item.image_urls ?? []).filter(Boolean);
  if (photos.length === 0) return null;

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div
        className={`grid gap-1 ${photos.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}
      >
        {photos.slice(0, 4).map((url, i) => (
          <div
            key={i}
            className={`group relative overflow-hidden bg-canvas ${
              photos.length === 3 && i === 0 ? "col-span-2" : ""
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`${item.title} 사진 ${i + 1}`}
              loading="lazy"
              className="aspect-[4/3] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none"
            />
          </div>
        ))}
      </div>
      {item.description && (
        <div className="px-4 py-3.5">
          <p className="flex items-center gap-1.5 text-[14px] font-bold text-ink">
            <MapPinIcon size={14} className="shrink-0 text-primary" />
            {item.title}
          </p>
          <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-sub">
            {item.description}
          </p>
        </div>
      )}
    </div>
  );
}

export default function ItineraryTimeline({ items }: { items: ItineraryItem[] }) {
  if (items.length === 0)
    return <p className="text-sm text-faint">일정이 준비 중입니다.</p>;

  const days = [...new Set(items.map((i) => i.day_no))].sort((a, b) => a - b);
  const multiDay = days.length > 1;

  return (
    <div className="space-y-8">
      {days.map((day) => {
        const dayItems = items.filter((i) => i.day_no === day);
        return (
          <div key={day}>
            {multiDay && (
              <p className="mb-3 inline-block rounded-lg bg-ink px-2.5 py-1 text-[12px] font-bold text-white">
                DAY {day}
              </p>
            )}
            <ol className="relative">
              {dayItems.map((item, idx) => {
                const isLast = idx === dayItems.length - 1;
                const isFirst = idx === 0;
                const hasPhotos = (item.image_urls ?? []).filter(Boolean).length > 0;
                return (
                  <li key={item.id} className="relative flex gap-3.5 pb-7 last:pb-0">
                    {!isLast && (
                      <span
                        className="absolute left-[7px] top-4 h-full w-[2px] bg-primary/25"
                        aria-hidden
                      />
                    )}
                    <span
                      className={`relative z-10 mt-1 h-4 w-4 shrink-0 rounded-full border-[3px] ${
                        isFirst || isLast
                          ? "border-primary bg-primary"
                          : "border-primary bg-white"
                      }`}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <Reveal>
                        <div className="flex items-baseline gap-2">
                          {item.time_text && (
                            <span className="flex shrink-0 items-center gap-1 text-[13px] font-extrabold text-primary">
                              <ClockIcon size={12} className="shrink-0" />
                              {item.time_text}
                            </span>
                          )}
                          <h3 className="text-[15px] font-bold text-ink">
                            {item.title}
                          </h3>
                        </div>
                        {!hasPhotos && item.description && (
                          <p className="mt-0.5 whitespace-pre-line text-[13px] leading-relaxed text-sub">
                            {item.description}
                          </p>
                        )}
                        <PhotoCard item={item} />
                      </Reveal>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        );
      })}
    </div>
  );
}
