import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/session";
import { normalizePhone } from "@/lib/otp";

// POST /api/account/phone/check { phone }
// 인증번호를 보내기 전에 사용 가능한 번호인지 먼저 확인 (헛된 SMS 발송 방지)
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { phone: rawPhone } = await req.json();
  const phone = normalizePhone(rawPhone);
  if (!phone) {
    return NextResponse.json({ error: "올바른 휴대폰 번호를 입력해 주세요." }, { status: 400 });
  }
  if (phone === user.phone) {
    return NextResponse.json({ error: "현재 사용 중인 번호입니다." }, { status: 400 });
  }

  const sb = createAdminSupabase();
  const { data: exists } = await sb
    .from("users")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();
  if (exists) {
    return NextResponse.json(
      { error: "이미 가입된 번호입니다. 다른 번호를 입력해 주세요." },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true });
}
