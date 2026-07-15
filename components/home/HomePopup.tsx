"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Popup } from "@/lib/api/popups";

/**
 * 홈 팝업 — PC 중앙 카드 모달 / 모바일 하단 시트
 * - 오늘 하루 보지 않기: localStorage(tb_popup_hide_<id> = YYYY-MM-DD)
 * - ESC / 바깥 클릭 닫기, 포커스 이동, ARIA
 * - 여러 팝업: 스와이프(터치/마우스 드래그) + 좌우 화살표 + 점 + ←/→ 방향키 + "1/2" 카운터
 * - 서버에서 활성 팝업을 이미 필터링해서 내려주므로 여기선 표시만 담당
 */

const hideKey = (id: string) => `tb_popup_hide_${id}`;

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function HomePopup({ popups }: { popups: Popup[] }) {
  const [items, setItems] = useState<Popup[]>([]);
  const [idx, setIdx] = useState(0);
  const [mounted, setMounted] = useState(false); // DOM 존재 여부
  const [shown, setShown] = useState(false); // 트랜지션 상태
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const dragStartX = useRef<number | null>(null);

  // 최초: '오늘 하루 보지 않기' 필터 후 표시
  useEffect(() => {
    if (!popups || popups.length === 0) return;
    let arr = popups;
    try {
      const today = todayStr();
      arr = popups.filter((p) => localStorage.getItem(hideKey(p.id)) !== today);
    } catch {
      // localStorage 접근 불가(사파리 프라이빗 등) — 그냥 표시
    }
    if (arr.length === 0) return;
    setItems(arr);
    setMounted(true);
    const raf = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(raf);
  }, [popups]);

  const close = useCallback(
    (hideToday: boolean) => {
      if (hideToday) {
        try {
          const today = todayStr();
          items.forEach((p) => localStorage.setItem(hideKey(p.id), today));
        } catch {
          // 저장 실패해도 닫기는 진행
        }
      }
      setShown(false);
      setTimeout(() => setMounted(false), 220); // 닫기 애니메이션 후 언마운트
    },
    [items]
  );

  const go = useCallback(
    (dir: -1 | 1) => {
      setIdx((i) => Math.min(Math.max(i + dir, 0), Math.max(items.length - 1, 0)));
    },
    [items.length]
  );

  // ESC 닫기 + ←/→ 전환 + 배경 스크롤 잠금 + 닫기 버튼 포커스
  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [mounted, close, go]);

  if (!mounted || items.length === 0) return null;

  const p = items[Math.min(idx, items.length - 1)];
  const multi = items.length > 1;

  // 스와이프: 터치/마우스 공통 (40px 이상 좌우 이동 시 전환)
  const onPointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (dragStartX.current === null) return;
    const dx = e.clientX - dragStartX.current;
    dragStartX.current = null;
    if (!multi || Math.abs(dx) < 40) return;
    go(dx < 0 ? 1 : -1);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center md:items-center md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tb-popup-title"
    >
      {/* 배경 */}
      <div
        onClick={() => close(false)}
        aria-hidden
        className={`absolute inset-0 bg-ink/40 transition-opacity duration-200 motion-reduce:transition-none ${
          shown ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* 카드: 모바일 하단 시트 / PC 중앙 모달 */}
      <div
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        style={{ touchAction: "pan-y" }}
        className={`relative w-full max-w-[420px] select-none overflow-hidden rounded-t-3xl bg-white shadow-2xl transition-all duration-200 motion-reduce:transition-none md:rounded-3xl ${
          shown
            ? "translate-y-0 opacity-100 md:scale-100"
            : "translate-y-8 opacity-0 md:translate-y-0 md:scale-95"
        }`}
      >
        {/* 닫기 (X) */}
        <button
          ref={closeBtnRef}
          onClick={() => close(false)}
          aria-label="팝업 닫기"
          className={`absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full transition active:scale-95 ${
            p.image_url
              ? "bg-ink/45 text-white backdrop-blur-sm"
              : "bg-canvas text-sub"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* 카운터 배지 (팝업 여러 개일 때) */}
        {multi && (
          <span
            className={`absolute left-3 top-3 z-10 rounded-full px-2.5 py-1 text-[11px] font-bold ${
              p.image_url ? "bg-ink/45 text-white backdrop-blur-sm" : "bg-canvas text-sub"
            }`}
            aria-label={`전체 ${items.length}개 중 ${idx + 1}번째 팝업`}
          >
            {idx + 1} / {items.length}
          </span>
        )}

        {/* 이미지 */}
        {p.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.image_url}
            alt={p.title}
            draggable={false}
            className="max-h-[42dvh] w-full object-cover md:max-h-[300px]"
          />
        )}

        {/* 본문 */}
        <div className="px-5 pb-4 pt-5">
          <h2 id="tb-popup-title" className="text-[17px] font-extrabold leading-snug">
            {p.title}
          </h2>
          {p.content && (
            <p className="prewrap mt-2 max-h-[22dvh] overflow-y-auto text-[13.5px] leading-relaxed text-sub">
              {p.content}
            </p>
          )}

          {/* 여러 팝업 전환: ‹ 점점 › */}
          {multi && (
            <div className="mt-3.5 flex items-center justify-center gap-3">
              <button
                onClick={() => go(-1)}
                disabled={idx === 0}
                aria-label="이전 팝업"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-sub transition active:scale-95 disabled:opacity-30"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <div className="flex items-center gap-1.5" role="tablist" aria-label="팝업 전환">
                {items.map((it, i) => (
                  <button
                    key={it.id}
                    role="tab"
                    aria-selected={i === idx}
                    aria-label={`${i + 1}번째 팝업 보기`}
                    onClick={() => setIdx(i)}
                    className={`h-2.5 rounded-full transition-all ${
                      i === idx ? "w-6 bg-primary" : "w-2.5 bg-line"
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={() => go(1)}
                disabled={idx === items.length - 1}
                aria-label="다음 팝업"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-sub transition active:scale-95 disabled:opacity-30"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          )}

          {/* 자세히 보기 */}
          {p.link_url && (
            <a
              href={p.link_url}
              className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-primary text-[15px] font-bold text-white transition active:scale-[0.98]"
            >
              자세히 보기
            </a>
          )}
        </div>

        {/* 하단 액션 */}
        <div className="flex divide-x divide-line border-t border-line pb-[env(safe-area-inset-bottom)]">
          <button
            onClick={() => close(true)}
            className="h-12 flex-1 text-[13px] font-semibold text-faint transition active:bg-canvas"
          >
            오늘 하루 보지 않기
          </button>
          <button
            onClick={() => close(false)}
            className="h-12 flex-1 text-[13px] font-semibold text-sub transition active:bg-canvas"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
