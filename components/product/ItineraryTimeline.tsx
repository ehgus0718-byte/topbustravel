import type { ItineraryItem } from "@/types";

/**
 * 버스 노선도 스타일 여행일정 타임라인
 * — topBustravel의 시그니처 UI: 정류장 도트 + 파란 노선 라인
 */
export default function ItineraryTimeline({ items }: { items: ItineraryItem[] }) {
  if (items.length === 0)
    return <p className="text-sm text-faint">일정이 준비 중입니다.</p>;

  const days = [...new Set(items.map((i) => i.day_no))].sort((a, b) => a - b);
  const multiDay = days.length > 1;

  return (
    <div className="space-y-6">
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
                return (
                  <li key={item.id} className="relative flex gap-3.5 pb-6 last:pb-0">
                    {/* 노선 라인 */}
                    {!isLast && (
                      <span
                        className="absolute left-[7px] top-4 h-full w-[2px] bg-primary/25"
                        aria-hidden
                      />
                    )}
                    {/* 정류장 도트 */}
                    <span
                      className={`relative z-10 mt-1 h-4 w-4 shrink-0 rounded-full border-[3px] ${
                        isFirst || isLast
                          ? "border-primary bg-primary"
                          : "border-primary bg-white"
                      }`}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        {item.time_text && (
                          <span className="shrink-0 text-[13px] font-extrabold text-primary">
                            {item.time_text}
                          </span>
                        )}
                        <h3 className="text-[15px] font-bold text-ink">
                          {item.title}
                        </h3>
                      </div>
                      {item.description && (
                        <p className="mt-0.5 text-[13px] leading-relaxed text-sub">
                          {item.description}
                        </p>
                      )}
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
