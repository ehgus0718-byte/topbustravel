/**
 * lib/refund.ts — 취소 시점별 환불 금액 계산
 *
 * /refund 페이지(예약·취소·환불 규정, 2026-08-30 시행)와 동일한 기준.
 * 규정 페이지를 바꾸면 여기도 반드시 같이 바꿀 것.
 *
 *   당일여행: 출발 3일 전까지 전액 / 2일 전 10% / 1일 전 20% / 당일·불참 30% 공제
 *   숙박여행: 출발 5일 전까지 전액 / 2일 전까지 10% / 1일 전 20% / 당일·불참 30% 공제
 *
 * 숙박 여부는 products.duration_text에 "박"이 포함되어 있는지로 판단 (예: "1박 2일").
 * 날짜 계산은 KST 달력 기준 (컨테이너가 UTC여도 동일하게 동작).
 */

export type RefundCalc = {
  overnight: boolean;
  daysBefore: number; // 출발일 - 오늘(KST), 음수면 이미 지남
  feeRate: number; // 0, 0.1, 0.2, 0.3
  fee: number;
  refund: number;
  rule: string; // 화면 표시용 설명
};

function todayKst(now: Date): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function dayDiff(fromYmd: string, toYmd: string): number {
  const a = Date.UTC(+fromYmd.slice(0, 4), +fromYmd.slice(5, 7) - 1, +fromYmd.slice(8, 10));
  const b = Date.UTC(+toYmd.slice(0, 4), +toYmd.slice(5, 7) - 1, +toYmd.slice(8, 10));
  return Math.round((b - a) / 86400000);
}

export function calcRefund(
  totalAmount: number,
  departureDate: string | null | undefined,
  durationText: string | null | undefined,
  now: Date = new Date()
): RefundCalc {
  const overnight = /박/.test(durationText ?? "");
  const daysBefore = departureDate ? dayDiff(todayKst(now), departureDate) : 0;

  let feeRate: number;
  let rule: string;
  const freeDays = overnight ? 5 : 3;
  if (daysBefore >= freeDays) {
    feeRate = 0;
    rule = `출발 ${freeDays}일 전까지 — 전액 환불`;
  } else if (daysBefore >= 2) {
    feeRate = 0.1;
    rule = "출발 2일 전까지 — 10% 공제";
  } else if (daysBefore === 1) {
    feeRate = 0.2;
    rule = "출발 1일 전 — 20% 공제";
  } else {
    feeRate = 0.3;
    rule = "출발 당일·불참 — 30% 공제";
  }

  // 공제액은 원 단위 내림 (고객에게 유리한 방향)
  const fee = Math.floor(totalAmount * feeRate);
  return {
    overnight,
    daysBefore,
    feeRate,
    fee,
    refund: totalAmount - fee,
    rule: `${overnight ? "숙박여행" : "당일여행"} · ${rule}`,
  };
}
