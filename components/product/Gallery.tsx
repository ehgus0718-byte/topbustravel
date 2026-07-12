"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import type { ProductImage } from "@/types";

/**
 * 갤러리 네비게이션 방식 결정 근거:
 * - 모바일: 기존 스와이프(overflow-x-auto + snap)는 터치에 자연스러워 그대로 유지.
 * - 데스크톱: 마우스는 스와이프 제스처가 없어 기존 UI로는 이동 수단이 키보드 방향키뿐이었음.
 *   자동 슬라이드는 채택하지 않음 — 예약 결정을 위해 사진을 비교하는 화면이라
 *   사용자가 자기 속도로 멈춰 보게 하는 게 맞고(에어비앤비/야놀자 등 예약 사이트의
 *   상품 갤러리도 대부분 자동재생을 쓰지 않음), 자동 전환은 오히려 특정 사진을
 *   더 보고 싶을 때 방해가 됨.
 * - 대신 (1) 좌우 화살표 버튼 (2) 마우스 드래그로 넘기기 (3) 하단 점 클릭 이동을
 *   모두 추가해 마우스만으로도 완전히 조작 가능하게 함.
 */
export default function Gallery({
  images,
  title,
}: {
  images: ProductImage[];
  title: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const drag = useRef<{ startX: number; startScroll: number; dragging: boolean } | null>(
    null
  );

  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center bg-canvas text-faint">
        이미지 준비중
      </div>
    );
  }

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  const goTo = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const clamped = (i + images.length) % images.length;
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
    setIndex(clamped);
  };

  // 마우스 드래그로 넘기기 (트랙패드 없는 데스크톱 마우스 사용자용)
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return; // 터치는 기존 네이티브 스와이프 사용
    const el = ref.current;
    if (!el) return;
    drag.current = { startX: e.clientX, startScroll: el.scrollLeft, dragging: true };
    el.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current?.dragging) return;
    const el = ref.current;
    if (!el) return;
    el.scrollLeft = drag.current.startScroll - (e.clientX - drag.current.startX);
  };
  const endDrag = () => {
    if (!drag.current) return;
    drag.current.dragging = false;
    // 놓은 위치에서 가장 가까운 사진으로 스냅
    goTo(Math.round((ref.current?.scrollLeft ?? 0) / (ref.current?.clientWidth || 1)));
  };

  return (
    <div className="group relative select-none">
      <div
        ref={ref}
        onScroll={onScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        className="flex snap-x snap-mandatory overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing"
      >
        {images.map((img, i) => (
          <div
            key={img.id}
            className="relative aspect-[4/3] w-full shrink-0 snap-center bg-canvas"
          >
            <Image
              src={img.image_url}
              alt={`${title} 사진 ${i + 1}`}
              fill
              sizes="(max-width: 480px) 100vw, 480px"
              className="pointer-events-none object-cover"
              priority={i === 0}
              draggable={false}
            />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          {/* 좌우 화살표 — 마우스 사용자를 위한 클릭 이동 (모바일은 스와이프로 대체 가능하니 터치 대상 축소 없이 공통 노출) */}
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label="이전 사진"
            className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-ink/45 text-white backdrop-blur-sm transition hover:bg-ink/65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label="다음 사진"
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-ink/45 text-white backdrop-blur-sm transition hover:bg-ink/65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </>
      )}

      <span className="absolute bottom-3 right-3 rounded-full bg-ink/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
        {index + 1} / {images.length}
      </span>
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`${i + 1}번째 사진으로 이동`}
              className="p-1"
            >
              <span
                className={`block h-1.5 rounded-full transition-all ${
                  i === index ? "w-4 bg-white" : "w-1.5 bg-white/50"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
