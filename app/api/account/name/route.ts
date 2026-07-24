import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import {
  getSessionUser,
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/session";

// PATCH /api/account/name { name } — 이름 변경 (인증 불필요)
export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const { name: raw } = await req.json();
    const name = String(raw || "").trim().slice(0, 30);
    if (name.length < 2) {
      return NextResponse.json({ error: "이름을 2자 이상 입력해 주세요." }, { status: 400 });
    }

    const sb = createAdminSupabase();
    const { error } = await sb.from("users").update({ name }).eq("id", user.uid);
    if (error) throw error;

    // 세션에도 이름이 들어 있으므로 갱신
    const token = await createSessionToken({ uid: user.uid, name, phone: user.phone });
    const res = NextResponse.json({ ok: true, name });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    return res;
  } catch (e: any) {
    console.error("[account/name]", e);
    return NextResponse.json({ error: "변경에 실패했습니다." }, { status: 500 });
  }
}
