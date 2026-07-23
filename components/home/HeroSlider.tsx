"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { HeroSlide } from "@/lib/api/heroSlides";

/**
 * 홈 히어로 이미지 슬라이더
 * - 전환: 부드러운 페이드 + 살짝 이동 (reduced motion 설정 시 페이드만)
 * - 자동재생 6초: 마우스 올림/직접 조작/일시정지 버튼/탭 이탈 시 멈춤
 * - 슬라이드 전체가 클릭 영역 (link_url 없으면 그냥 사진만)
 * - 모바일 스와이프 + PC 좌우 화살표 + dot 인디케이터
 */
export default function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false); // 일시정지 버튼
  const [userNavigated, setUserNavigated] = useState(false); // 직접 조작하면 자동재생 중단
  const [reducedMotion, setReducedMotion] = useState(false);
  const dragStartX = useRef<number | null>(null);
  const count = slides.length;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const goTo = useCallback(
    (next: number, byUser: boolean) => {
      if (count <= 1) return;
      if (byUser) setUserNavigated(true);
      setIndex(((next % count) + count) % count);
    },
    [count]
  );

  // 자동재생 (6초)
  useEffect(() => {
    if (count <= 1 || paused || userNavigated || reducedMotion) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") {
        setIndex((i) => (i + 1) % count);
      }
    }, 6000);
    return () => clearInterval(t);
  }, [count, paused, userNavigated, reducedMotion]);

  // 스와이프 / 드래그
  const onPointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (dragStartX.current === null) return;
    const dx = e.clientX - dragStartX.current;
    dragStartX.current = null;
    if (Math.abs(dx) < 40) return; // 짧은 이동은 클릭으로 취급
    goTo(index + (dx < 0 ? 1 : -1), true);
  };

  // 키보드 (포커스가 슬라이더 안에 있을 때)
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") goTo(index + 1, true);
    if (e.key === "ArrowLeft") goTo(index - 1, true);
  };

  if (count === 0) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="추천 여행 슬라이드"
      className="group relative select-none overflow-hidden bg-ink"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (dragStartX.current = null)}
      onKeyDown={onKeyDown}
      style={{ touchAction: "pan-y" }}
    >
      <div className="relative h-[320px] md:h-[430px]">
        {slides.map((s, i) => {
          const active = i === index;
          return (
            <div
              key={s.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${count}`}
              aria-hidden={!active}
              className={`absolute inset-0 transition-[opacity,transform] duration-700 ease-out ${
                active
                  ? "z-[1] translate-x-0 opacity-100"
                  : "pointer-events-none z-0 opacity-0 " +
                    (reducedMotion ? "" : i < index ? "-translate-x-3" : "translate-x-3")
              }`}
            >
              <SlideLink slide={s} active={active}>
                <Image
                  src={s.image_url}
                  alt={s.title}
                  fill
                  priority={i === 0}
                  sizes="100vw"
                  className="object-cover"
                  draggable={false}
                />
                {/* 가독성 오버레이: 좌측(텍스트) + 하단(인디케이터) */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-black/10" />
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/45 to-transparent" />

                {/* 텍스트 */}
                <div className="absolute inset-0">
                  <div className="mx-auto flex h-full max-w-6xl flex-col justify-center px-5 pb-8 md:px-6">
                    {s.badge && (
                      <span className="mb-2.5 w-fit rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold text-white md:mb-3 md:px-3 md:text-[12px]">
                        {s.badge}
                      </span>
                    )}
                    <h2 className="max-w-[520px] text-[24px] font-extrabold leading-tight text-white drop-shadow-sm md:text-[40px]">
                      {s.title}
                    </h2>
                    {s.subtitle && (
                      <p className="mt-2 max-w-[460px] text-[13px] leading-relaxed text-white/85 md:mt-3 md:text-[16px]">
                        {s.subtitle}
                      </p>
                    )}
                    {s.link_url && (
                      <span className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-[13px] font-bold text-ink transition group-hover:bg-white/90 md:mt-6 md:px-5 md:py-3 md:text-[14px]">
                        자세히 보기 →
                      </span>
                    )}
                  </div>
                </div>
              </SlideLink>
            </div>
          );
        })}

        {/* 좌우 화살표 (PC) */}
        {count > 1 && (
          <>
            <ArrowButton dir="prev" onClick={() => goTo(index - 1, true)} />
            <ArrowButton dir="next" onClick={() => goTo(index + 1, true)} />
          </>
        )}

        {/* dot + 일시정지 */}
        {count > 1 && (
          <div className="absolute inset-x-0 bottom-0 z-[2]">
            <div className="mx-auto flex max-w-6xl items-center gap-1 px-5 pb-3.5 md:px-6 md:pb-4">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  aria-label={`${i + 1}번 슬라이드 보기`}
                  aria-current={i === index}
                  onClick={() => goTo(i, true)}
                  className="flex h-7 w-7 items-center justify-center"
                >
                  <span
                    className={`block rounded-full transition-all duration-300 ${
                      i === index ? "h-2 w-5 bg-white" : "h-2 w-2 bg-white/50"
                    }`}
                  />
                </button>
              ))}
              <span className="ml-1.5 text-[11px] font-semibold text-white/70 md:text-[12px]">
                {index + 1} / {count}
              </span>
              <button
                type="button"
                aria-label={paused || userNavigated ? "자동재생 시작" : "자동재생 일시정지"}
                onClick={() => {
                  if (userNavigated) {
                    setUserNavigated(false);
                    setPaused(false);
                  } else {
                    setPaused((p) => !p);
                  }
                }}
                className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-black/25 text-white transition hover:bg-black/40"
              >
                {paused || userNavigated ? (
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
                    <path d="M8 5.5v13l11-6.5z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
                    <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/** 슬라이드 전체 클릭 영역 — 내부 경로는 Link, 외부 주소는 새 창 */
function SlideLink({
  slide,
  active,
  children,
}: {
  slide: HeroSlide;
  active: boolean;
  children: React.ReactNode;
}) {
  const cls = "absolute inset-0 block";
  if (!slide.link_url) return <div className={cls}>{children}</div>;
  const external = /^https?:\/\//i.test(slide.link_url);
  if (external) {
    return (
      <a
        href={slide.link_url}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={active ? 0 : -1}
        className={cls}
        draggable={false}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={slide.link_url} tabIndex={active ? 0 : -1} className={cls} draggable={false}>
      {children}
    </Link>
  );
}

function ArrowButton({ dir, onClick }: { dir: "prev" | "next"; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={dir === "prev" ? "이전 슬라이드" : "다음 슬라이드"}
      onClick={onClick}
      className={`absolute top-1/2 z-[2] hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/25 text-white opacity-0 transition hover:bg-black/45 focus-visible:opacity-100 group-hover:opacity-100 md:flex ${
        dir === "prev" ? "left-4" : "right-4"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className={`h-5 w-5 ${dir === "prev" ? "" : "rotate-180"}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
  );
}
