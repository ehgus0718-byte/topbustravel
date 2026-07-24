import type { SupabaseClient } from "@supabase/supabase-js";

/** 탈퇴 신청 후 실제 삭제까지의 유예 기간(일) */
export const WITHDRAW_GRACE_DAYS = 3;

/** 출발이 남아 있는 진행 중 예약 상태 */
const ACTIVE_STATUSES = ["pending", "paid", "confirmed"];

/**
 * 아직 출발하지 않은 진행 중 예약이 있는지 확인.
 * 여행을 앞두고 연락이 끊기는 사고를 막기 위해 탈퇴를 제한하는 용도.
 */
export async function findUpcomingReservation(
  sb: SupabaseClient,
  uid: string,
  phone: string
): Promise<{ id: string; departure_date: string | null } | null> {
  const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data } = await sb
    .from("reservations")
    .select("id, status, departure:departures(departure_date)")
    .or(`user_uid.eq.${uid},customer_phone.eq.${phone}`)
    .in("status", ACTIVE_STATUSES)
    .limit(50);

  for (const r of (data ?? []) as any[]) {
    const d = r.departure?.departure_date as string | undefined;
    // 출발일이 없거나(미정) 오늘 이후면 진행 중으로 간주
    if (!d || d >= today) return { id: r.id, departure_date: d ?? null };
  }
  return null;
}

/**
 * 유예 기간이 끝난 계정을 실제로 정리.
 * 개인 데이터(회원 정보·찜·번호 변경 이력)는 삭제하고,
 * 예약(거래) 기록은 보존한다 — 사업자 거래기록 보관 목적.
 */
export async function purgeWithdrawnUser(sb: SupabaseClient, userId: string) {
  await sb.from("wishlists").delete().eq("user_uid", userId);
  await sb.from("user_phone_changes").delete().eq("user_id", userId);
  await sb.from("users").delete().eq("id", userId);
}

/** 탈퇴 예정일이 지났는지 */
export function isPastDue(scheduledAt: string | null | undefined): boolean {
  if (!scheduledAt) return false;
  return new Date(scheduledAt).getTime() <= Date.now();
}

/** 표시용: 'YYYY년 M월 D일' */
export function formatKoreanDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}
