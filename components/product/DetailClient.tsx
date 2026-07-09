"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Departure, ProductDetail } from "@/types";
import { won, fmtDate } from "@/lib/format";
import Gallery from "./Gallery";
import DepartureCalendar from "./DepartureCalendar";
import ItineraryTimeline from "./ItineraryTimeline";
import ReviewList from "./ReviewList";

const SECTIONS = [
  { id: "sec-desc", label: "상세설명" },
  { id: "sec-include", label: "포함/불포함" },
  { id: "sec-itinerary", label: "여행일정" },
  { id: "sec-notice", label: "유의사항" },
  { id: "sec-review", label: "리뷰" },
] as const;

export default function DetailClient({
  product,
  tel,
  kakaoUrl,
}: {
  product: ProductDetail;
  tel: string;
  kakaoUrl: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Departure | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [pulse, setPulse] = useState(false);

  const avgRating = useMemo(() => {
    if (product.reviews.length === 0) return null;
    return (
      product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length
    ).toFixed(1);
  }, [product.reviews]);

  const goReserve = () => {
    if (!selected) {
      calendarRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setPulse(true);
      setTimeout(() => setPulse(false), 2000);
      return;
    }
    router.push(`/reserve/${product.slug}?date=${selected.departure_date}`);
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="pb-28">
      <Gallery images={product.images} title={product.title} />

      {/* 타이틀 영역 */}
      <div className="border-b-8 border-canvas px-4 py-5">
        <div className="flex items-center gap-1.5 text-[12px] font-semibold">
          <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-primary">
            {product.duration_text}
          </span>
          {product.category?.name && (
            <span className="text-faint">{product.category.name}</span>
          )}
        </div>
        <h1 className="mt-2 text-[21px] font-extrabold leading-snug">
          {product.title}
        </h1>
        {product.summary && (
          <p className="mt-1.5 text-[14px] leading-relaxed text-sub">{product.summary}</p>
        )}
        {avgRating && (
          <button
            onClick={() => scrollTo("sec-review")}
            className="mt-2 flex items-center gap-1 text-[13px] font-semibold text-ink"
          >
            <span className="text-accent">★</span> {avgRating}
            <span className="font-medium text-faint">
              리뷰 {product.reviews.length}개 ›
            </span>
          </button>
        )}
        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-[13px] text-faint">1인</span>
          <span className="text-[24px] font-extrabold text-ink">
            {won(product.base_price)}
          </span>
          <span className="text-[14px] text-faint">부터</span>
        </div>
      </div>

      {/* 출발일 선택 */}
      <div
        ref={calendarRef}
        className={`border-b-8 border-canvas px-4 py-5 ${pulse ? "tb-pulse" : ""}`}
      >
        <h2 className="text-[17px] font-extrabold">출발일 선택</h2>
        <p className="mt-1 text-[13px] text-faint">
          예약 가능한 날짜에 가격이 표시됩니다.
        </p>
        <DepartureCalendar
          departures={product.departures}
          basePrice={product.base_price}
          selectedId={selected?.id ?? null}
          onSelect={setSelected}
        />
        {selected && (
          <div className="mt-3 flex items-center justify-between rounded-xl bg-primary-soft px-4 py-3">
            <div>
              <p className="text-[13px] font-semibold text-primary">
                {fmtDate(selected.departure_date)} 출발
              </p>
              <p className="text-[12px] text-sub">
                잔여 {Math.max(selected.total_seats - selected.reserved_seats, 0)}석
              </p>
            </div>
            <p className="text-[16px] font-extrabold text-primary">
              {won(selected.adult_price ?? product.base_price)}
            </p>
          </div>
        )}
      </div>

      {/* 섹션 탭 */}
      <div className="sticky top-14 z-30 flex border-b border-line bg-white">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => scrollTo(s.id)}
            className="flex-1 py-3 text-[13px] font-semibold text-sub active:text-ink"
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* 상세설명 */}
      <section id="sec-desc" className="scroll-mt-28 border-b-8 border-canvas px-4 py-6">
        <h2 className="mb-3 text-[17px] font-extrabold">상세설명</h2>
        <p className="prewrap text-[14.5px] leading-relaxed text-ink">
          {product.description || "상세 설명이 준비 중입니다."}
        </p>
      </section>

      {/* 포함/불포함 */}
      <section id="sec-include" className="scroll-mt-28 border-b-8 border-canvas px-4 py-6">
        <h2 className="mb-4 text-[17px] font-extrabold">포함 / 불포함</h2>
        <div className="grid grid-cols-1 gap-3">
          <div className="rounded-2xl bg-canvas p-4">
            <p className="mb-2.5 text-[13px] font-bold text-success">✓ 포함사항</p>
            <ul className="space-y-1.5">
              {product.includes.map((item, i) => (
                <li key={i} className="text-[14px] text-ink">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-canvas p-4">
            <p className="mb-2.5 text-[13px] font-bold text-danger">✕ 불포함사항</p>
            <ul className="space-y-1.5">
              {product.excludes.map((item, i) => (
                <li key={i} className="text-[14px] text-sub">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 여행일정 (노선도 타임라인) */}
      <section id="sec-itinerary" className="scroll-mt-28 border-b-8 border-canvas px-4 py-6">
        <h2 className="mb-1 text-[17px] font-extrabold">여행일정</h2>
        <p className="mb-4 text-[13px] text-faint">
          현지 사정에 따라 일부 일정이 변경될 수 있습니다.
        </p>
        {product.boarding_points.length > 0 && (
          <div className="mb-5 rounded-2xl border border-line p-4">
            <p className="mb-2.5 text-[13px] font-bold text-primary">🚌 탑승지 안내</p>
            <ul className="space-y-2">
              {product.boarding_points.map((b) => (
                <li key={b.id} className="flex items-center gap-2.5 text-[14px]">
                  <span className="w-12 shrink-0 font-bold text-ink">
                    {b.boarding_time}
                  </span>
                  <span className="text-sub">{b.name}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] leading-relaxed text-faint">
              탑승 시간을 꼭 지켜주세요. 차량번호는 출발 전 문자로 안내됩니다.
            </p>
          </div>
        )}
        <ItineraryTimeline items={product.itinerary} />
      </section>

      {/* 유의사항/환불규정 */}
      <section id="sec-notice" className="scroll-mt-28 border-b-8 border-canvas px-4 py-6">
        <h2 className="mb-3 text-[17px] font-extrabold">유의사항</h2>
        <p className="prewrap text-[13.5px] leading-relaxed text-sub">
          {product.notices || "-"}
        </p>
        <h2 className="mb-3 mt-6 text-[17px] font-extrabold">취소/환불 규정</h2>
        <div className="rounded-2xl bg-canvas p-4">
          <p className="prewrap text-[13.5px] leading-relaxed text-sub">
            {product.refund_policy || "-"}
          </p>
        </div>
      </section>

      {/* 리뷰 */}
      <section id="sec-review" className="scroll-mt-28 px-4 py-6">
        <h2 className="mb-4 text-[17px] font-extrabold">
          여행 후기{" "}
          {avgRating && (
            <span className="text-[15px] font-bold text-accent">
              ★ {avgRating}
            </span>
          )}
        </h2>
        <ReviewList productId={product.id} reviews={product.reviews} />
      </section>

      {/* 스티키 하단 CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] border-t border-line bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2.5">
        <div className="flex items-center gap-2">
          <a
            href={`tel:${tel.replace(/-/g, "")}`}
            aria-label="전화 문의"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line text-ink active:bg-canvas"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </a>
          <a
            href={kakaoUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="카카오톡 문의"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FEE500] text-[#191919] active:opacity-80"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 3C6.48 3 2 6.54 2 10.9c0 2.8 1.86 5.26 4.66 6.65-.2.75-.75 2.73-.86 3.15-.13.53.2.52.41.38.17-.11 2.68-1.82 3.77-2.56.65.1 1.32.15 2.02.15 5.52 0 10-3.54 10-7.77S17.52 3 12 3z" />
            </svg>
          </a>
          <button
            onClick={goReserve}
            className={`h-12 flex-1 rounded-xl text-[15px] font-bold text-white transition active:scale-[0.98] ${
              selected ? "bg-primary" : "bg-primary/85"
            }`}
          >
            {selected ? `${fmtDate(selected.departure_date)} 예약하기` : "출발일 선택하고 예약하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
