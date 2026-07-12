export function won(n: number | null | undefined): string {
  if (n == null) return "-";
  return n.toLocaleString("ko-KR") + "원";
}

// 62000 -> "6.2만"
export function manwon(n: number): string {
  const m = n / 10000;
  return (Number.isInteger(m) ? m : m.toFixed(1)) + "만";
}

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function fmtDate(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAYS[d.getDay()]})`;
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function formatPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

// "홍길동" -> "홍*동", "김수" -> "김*", "이" -> "이"
// 리뷰 작성자 표기 등 회원 실명을 그대로 노출하지 않을 때 사용
export function maskName(name: string): string {
  const s = name.trim();
  if (s.length <= 1) return s;
  if (s.length === 2) return `${s[0]}*`;
  return `${s[0]}${"*".repeat(s.length - 2)}${s[s.length - 1]}`;
}

export const STATUS_LABEL: Record<string, string> = {
  pending: "결제대기",
  paid: "결제완료",
  confirmed: "예약확정",
  canceled: "취소",
  refunded: "환불",
};
