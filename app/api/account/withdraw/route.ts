import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getSessionUser, SESSION_COOKIE } from "@/lib/session";
import {
  WITHDRAW_GRACE_DAYS,
  findUpcomingReservation,
  formatKoreanDate,
} from "@/lib/account";

/**
 * POST /api/account/withdraw — 탈퇴 신청
 * 즉시 삭제하지 않고 유예 기간을 둔다. 유예 중 로그인하면 취소할 수 있다.
 * 출발 전 예약이 남아 있으면 신청을 막는다.
 */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const sb = createAdminSupabase();

    const upcoming = await findUpcomingReservation(sb, user.uid, user.phone);
    if (upcoming) {
      return NextResponse.json(
        {
          error:
            "출발 예정인 예약이 있어 탈퇴할 수 없습니다. 예약을 마치신 뒤 또는 취소 후 진행해 주세요.",
          code: "HAS_UPCOMING",
        },
        { status: 409 }
      );
    }

    const now = new Date();
    const scheduled = new Date(now.getTime() + WITHDRAW_GRACE_DAYS * 24 * 60 * 60 * 1000);

    const { error } = await sb
      .from("users")
      .update({
        withdraw_requested_at: now.toISOString(),
        withdraw_scheduled_at: scheduled.toISOString(),
      })
      .eq("id", user.uid);
    if (error) throw error;

    // 신청 즉시 로그아웃 — 계정은 잠긴 상태가 된다
    const res = NextResponse.json({
      ok: true,
      scheduledAt: scheduled.toISOString(),
      scheduledText: formatKoreanDate(scheduled.toISOString()),
      graceDays: WITHDRAW_GRACE_DAYS,
    });
    res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  } catch (e) {
    console.error("[account/withdraw]", e);
    return NextResponse.json({ error: "탈퇴 신청에 실패했습니다." }, { status: 500 });
  }
}
