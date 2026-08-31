import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

/**
 * POST /api/auth/kakao/webhook?key=<KAKAO_WEBHOOK_SECRET>
 *
 * 카카오 "연결 해제 웹훅(User Unlinked)" 수신.
 * 사용자가 카카오 계정에서 이 앱과의 연결을 끊거나 카카오를 탈퇴하면 호출된다.
 *
 * 처리 원칙
 *  - 회원 계정을 삭제하지 않는다. 전자상거래법상 계약·결제 기록은 5년 보관 의무가 있고,
 *    고객은 휴대폰 인증으로 계속 로그인할 수 있어야 한다.
 *  - kakao_id 만 비워 카카오 연결을 해제한다.
 *
 * 인증: 카카오는 서명을 보내지 않으므로 URL 쿼리의 공유 비밀값으로 확인한다.
 */

export async function POST(req: Request) {
  // 실제 요청 형식을 확인할 수 있도록 원문을 남긴다 (개인정보는 카카오 회원번호뿐)
  let raw = "";
  try {
    const url = new URL(req.url);
    const secret = process.env.KAKAO_WEBHOOK_SECRET;
    if (secret && url.searchParams.get("key") !== secret) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    raw = await req.text();
    console.log("[kakao/webhook] raw =", raw);

    let body: Record<string, unknown> = {};
    try {
      body = JSON.parse(raw || "{}");
    } catch {
      // form 형식으로 올 가능성도 열어둔다
      body = Object.fromEntries(new URLSearchParams(raw));
    }

    // 카카오 회원번호가 담길 만한 필드를 모두 확인 (형식 확정 전 방어)
    const candidate =
      body.user_id ?? body.userId ?? body.id ?? body.for_user ?? body.target_id;
    const kakaoId = candidate == null ? "" : String(candidate).trim();

    if (!kakaoId) {
      console.warn("[kakao/webhook] 회원번호를 찾지 못함:", raw);
      // 카카오가 재시도하지 않도록 200 으로 응답
      return NextResponse.json({ ok: true, matched: false });
    }

    const sb = createAdminSupabase();
    const { data, error } = await sb
      .from("users")
      .update({ kakao_id: null })
      .eq("kakao_id", kakaoId)
      .select("id");
    if (error) throw error;

    console.log(
      `[kakao/webhook] 연결 해제 처리: kakaoId=${kakaoId}, 대상=${data?.length ?? 0}건`
    );
    return NextResponse.json({ ok: true, matched: (data?.length ?? 0) > 0 });
  } catch (e) {
    console.error("[kakao/webhook]", e, "raw =", raw);
    // 실패해도 200 을 돌려 카카오의 반복 재시도를 막고, 로그로 추적한다
    return NextResponse.json({ ok: true, error: true });
  }
}

/** 카카오 콘솔에서 URL 유효성 확인용으로 GET 을 호출하는 경우 대비 */
export async function GET() {
  return NextResponse.json({ ok: true });
}
