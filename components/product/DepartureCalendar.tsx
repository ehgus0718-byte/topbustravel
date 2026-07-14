"use client";
import { useMemo, useState } from "react";
import type { Departure } from "@/types";
import { manwon } from "@/lib/format";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function ym(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function DepartureCalendar({
  departures,
  basePrice,
  selectedId,
  onSelect,
}: {
  departures: Departure[];
  basePrice: number;
  selectedId: string | null;
  onSelect: (d: Departure) => void;
}) {
  // 날짜 → 출발일 매핑
  const byDate = useMemo(() => {
    const m = new Map<string, Departure>();
    for (const d of departures) m.set(d.departure_date, d);
    return m;
  }, [departures]);

  // 표시 가능한 월 목록 (이번 달 ~ 출발일이 있는 마지막 달)
  const months = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    let end = start;
    if (departures.length > 0) {
      const last = departures[departures.length - 1].departure_date;
      end = new Date(Number(last.slice(0, 4)), Number(last.slice(5, 7)) - 1, 1);
    }
    const list: Date[] = [];
    const cur = new Date(start);
    while (cur <= end && list.length < 12) {
      list.push(new Date(cur));
      cur.setMonth(cur.getMonth() + 1);
    }
    return list.length ? list : [start];
  }, [departures]);

  const [monthIdx, setMonthIdx] = useState(0);
  const month = months[Math.min(monthIdx, months.length - 1)];

  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const blanks = first.getDay();
    const out: (number | null)[] = Array(blanks).fill(null);
    for (let d = 1; d <= lastDay; d++) out.push(d);
    return out;
  }, [month]);

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="mt-4">
      {/* 월 네비게이션 */}
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => setMonthIdx((i) => Math.max(0, i - 1))}
          disabled={monthIdx === 0}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-sm transition active:scale-95 disabled:bg-line disabled:text-faint disabled:shadow-none"
          aria-label="이전 달"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <p className="text-[16px] font-extrabold">
          {month.getFullYear()}년 {month.getMonth() + 1}월
        </p>
        <button
          onClick={() => setMonthIdx((i) => Math.min(months.length - 1, i + 1))}
          disabled={monthIdx >= months.length - 1}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-sm transition active:scale-95 disabled:bg-line disabled:text-faint disabled:shadow-none"
          aria-label="다음 달"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 text-center">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`pb-2 text-[12px] font-semibold ${
              i === 0 ? "text-danger" : i === 6 ? "text-primary" : "text-faint"
            }`}
          >
            {w}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`b${i}`} />;
          const dateStr = `${ym(month)}-${String(day).padStart(2, "0")}`;
          const dep = byDate.get(dateStr);
          const remaining = dep ? dep.total_seats - dep.reserved_seats : 0;
          const available =
            !!dep && dep.status === "open" && remaining > 0 && dateStr >= todayStr;
          const selected = !!dep && dep.id === selectedId;

          return (
            <button
              key={dateStr}
              disabled={!available}
              onClick={() => dep && onSelect(dep)}
              className={`flex aspect-[3/4] flex-col items-center justify-center gap-0.5 rounded-lg text-[14px] transition ${
                selected
                  ? "bg-primary font-bold text-white"
                  : available
                    ? "font-semibold text-ink active:bg-primary-soft"
                    : "text-line"
              }`}
            >
              {day}
              {available && (
                <span
                  className={`text-[10px] font-bold ${
                    selected ? "text-white/90" : "text-accent"
                  }`}
                >
                  {manwon(dep!.adult_price ?? basePrice)}
                </span>
              )}
              {!!dep && dateStr >= todayStr && (dep.status !== "open" || remaining <= 0) && (
                <span className="text-[10px] text-faint">마감</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
