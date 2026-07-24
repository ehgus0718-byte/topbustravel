import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import {
  verifyToken,
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/session";
import { isPastDue, purgeWithdrawnUser } from "@/lib/account";

/**
 * POST /api/account/withdraw/cancel { restoreToken }
 * 유예 기간 중 로그인 인증을 마친 사용자가 탈퇴를 취소하고 계정을 되살린다.
 */
export async function POST(req: Request) {
  try {
    const { restoreToken } = await req.json();
    const payload = await verifyToken<{ t: string; uid: string }>(restoreToken);
    if (!payload || payload.t !== "restore") {
      return NextResponse.json(
        { error: "요청이 만료되었습니다. 다시 로그인해 주세요." },
        { status: 400 }
      );
    }

    const sb = createAdminSupabase();
    const { data: user } = await sb
      .from("users")
      .select("id, name, phone, withdraw_scheduled_at")
      .eq("id", payload.uid)
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ error: "계정을 찾을 수 없습니다." }, { status: 404 });
    }

    // 이미 유예가 끝났다면 되살리지 않고 정리 (신규 가입으로 안내)
    if (isPastDue(user.withdraw_scheduled_at)) {
      await purgeWithdrawnUser(sb, user.id);
      return NextResponse.json(
        { error: "탈퇴 처리가 이미 완료되었습니다. 새로 가입해 주세요." },
        { status: 410 }
      );
    }

    const { error } = await sb
      .from("users")
      .update({
        withdraw_requested_at: null,
        withdraw_scheduled_at: null,
        last_login_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    if (error) throw error;

    const token = await createSessionToken({
      uid: user.id,
      name: user.name,
      phone: user.phone,
    });
    const res = NextResponse.json({ ok: true, name: user.name });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    return res;
  } catch (e) {
    console.error("[account/withdraw/cancel]", e);
    return NextResponse.json({ error: "처리에 실패했습니다." }, { status: 500 });
  }
}
