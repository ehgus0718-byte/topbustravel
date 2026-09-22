import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/sms/solapi";
import {
  NICEPAY_MID,
  NICEPAY_CANCEL_URL,
  getEdiDate,
  buildCancelSign,
  buildFormBody,
} from "@/lib/nicepay";
import { calcRefund } from "@/lib/refund";

/**
 * /api/admin/reservations/[id]/cancel — 관리자 카드 취소·환불 (나이스페이 구모듈 취소 API)
 *
 * GET  : 환불 미리보기 (규정 기준 공제액/환불액 계산만, 부작용 없음)
 * POST : { refundAmount: number, sendSms?: boolean, reason?: string }
 *        refundAmount == 결제금액 → 전체취소(PartialCancelCode=0), 작으면 부분취소(1)
 *
 * 안전장치 (중복 환불 방지가 최우선):
 *  1) 상태가 paid/confirmed 이고 payment_tid 가 있는 카드 결제건만
 *  2) 같은 예약에 대한 동시 요청은 프로세스 내 잠금으로 차단 (단일 컨테이너)
 *  3) 이전 취소 성공/결과미확인 기록(reservation_change_logs)이 있으면 차단
 *  4) 나이스페이 성공 응답(2001/2211)을 받은 뒤에만 DB 상태 변경
 *  5) 통신 실패로 결과를 모르면 '결과 미확인' 기록을 남기고 재시도를 막음
 *     → 나이스페이 상점관리자에서 직접 확인 후 처리
 *
 * 기존 PATCH(/api/admin/reservations/[id])는 건드리지 않음.
 * 관리자 인증은 middleware.ts가 /api/admin 전체에 적용.
 */

type Ctx = { params: Promise<{ id: string }> };

const CANCEL_OK = new Set(["2001", "2211"]);
const LOG_OK = "payment_cancel";
const LOG_UNKNOWN = "payment_cancel_unknown";

// 동일 예약 동시 취소 요청 차단 (더블클릭·중복 탭)
const inFlight = new Set<string>();

async function loadContext(id: string) {
  const sb = createAdminSupabase();
  const { data: r, error } = await sb
    .from("reservations")
    .select(
      "*, product:products(title, duration_text), departure:departures(departure_date)"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return { sb, r: r as any };
}

function checkCancelable(r: any): string | null {
  if (!r) return "예약을 찾을 수 없습니다.";
  if (!["paid", "confirmed"].includes(r.status))
    return "결제완료·예약확정 상태의 예약만 카드 취소할 수 있습니다.";
  if (r.payment_method === "bank") return "무통장 입금 건은 계좌로 직접 환불해 주세요.";
  if (!r.payment_tid) return "결제 TID가 없어 자동 취소할 수 없습니다. 나이스페이 상점관리자에서 처리해 주세요.";
  if (!r.total_amount || r.total_amount <= 0) return "결제 금액 정보가 없습니다.";
  return null;
}

async function priorCancelLog(sb: any, id: string) {
  const { data } = await sb
    .from("reservation_change_logs")
    .select("field, created_at")
    .eq("reservation_id", id)
    .in("field", [LOG_OK, LOG_UNKNOWN])
    .limit(1);
  return (data ?? [])[0] ?? null;
}

// ── GET: 미리보기 ─────────────────────────────────────────────────────
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    const { sb, r } = await loadContext(id);
    const blocked = checkCancelable(r);
    if (blocked) return NextResponse.json({ error: blocked }, { status: 400 });

    const prior = await priorCancelLog(sb, id);
    if (prior) {
      return NextResponse.json(
        {
          error:
            prior.field === LOG_OK
              ? "이미 카드 취소가 처리된 예약입니다."
              : "이전 취소 요청의 결과가 확인되지 않았습니다. 나이스페이 상점관리자에서 먼저 확인해 주세요.",
        },
        { status: 409 }
      );
    }

    const calc = calcRefund(
      r.total_amount,
      r.departure?.departure_date,
      r.product?.duration_text
    );
    return NextResponse.json({
      total: r.total_amount,
      departureDate: r.departure?.departure_date ?? null,
      ...calc,
    });
  } catch (e: any) {
    console.error("[admin/cancel GET]", e);
    return NextResponse.json({ error: "조회에 실패했습니다." }, { status: 500 });
  }
}

// ── POST: 실제 취소 ───────────────────────────────────────────────────
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  if (inFlight.has(id)) {
    return NextResponse.json({ error: "이미 취소 처리 중입니다." }, { status: 409 });
  }
  inFlight.add(id);

  try {
    const body = await req.json().catch(() => ({}));
    const refundAmount = Math.floor(Number(body.refundAmount));
    const notify = body.sendSms !== false;
    const reason = String(body.reason ?? "").trim().slice(0, 100);

    const { sb, r } = await loadContext(id);
    const blocked = checkCancelable(r);
    if (blocked) return NextResponse.json({ error: blocked }, { status: 400 });

    if (!Number.isFinite(refundAmount) || refundAmount < 1 || refundAmount > r.total_amount) {
      return NextResponse.json(
        { error: `환불 금액은 1원 ~ ${r.total_amount.toLocaleString()}원 사이여야 합니다.` },
        { status: 400 }
      );
    }

    const prior = await priorCancelLog(sb, id);
    if (prior) {
      return NextResponse.json(
        { error: "이미 취소 처리됐거나 결과 미확인 건입니다. 나이스페이 상점관리자에서 확인해 주세요." },
        { status: 409 }
      );
    }

    const isPartial = refundAmount < r.total_amount;
    const fee = r.total_amount - refundAmount;
    const ediDate = getEdiDate();
    const cancelAmt = String(refundAmount);

    // CancelMsg는 euc-kr 인코딩 이슈를 피하기 위해 ASCII로만 전송 (한글 사유는 DB 기록에만)
    const cancelParams = {
      TID: r.payment_tid,
      MID: NICEPAY_MID,
      Moid: r.id,
      CancelAmt: cancelAmt,
      CancelMsg: isPartial ? "partial refund" : "customer cancel",
      PartialCancelCode: isPartial ? "1" : "0",
      EdiDate: ediDate,
      SignData: buildCancelSign(cancelAmt, ediDate),
      CharSet: "utf-8",
      EdiType: "JSON",
    };

    let result: Record<string, any>;
    try {
      const res = await fetch(NICEPAY_CANCEL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded; charset=euc-kr" },
        body: buildFormBody(cancelParams),
        signal: AbortSignal.timeout(15000),
      });
      const text = await res.text();
      result = JSON.parse(text);
    } catch (e) {
      // 결과를 알 수 없음 — 취소가 됐을 수도 있으므로 재시도를 막는다
      console.error("[admin/cancel] CRITICAL 나이스페이 취소 통신 실패 — 결과 미확인", {
        id,
        tid: r.payment_tid,
        refundAmount,
        e,
      });
      await sb.from("reservation_change_logs").insert({
        reservation_id: id,
        changed_by: "admin",
        admin_id: "admin",
        field: LOG_UNKNOWN,
        old_value: `${r.total_amount.toLocaleString()}원 결제`,
        new_value: `${refundAmount.toLocaleString()}원 취소 요청 — 응답 없음 (TID ${r.payment_tid})`,
      });
      return NextResponse.json(
        {
          error:
            "나이스페이 응답을 받지 못했습니다. 취소가 됐을 수 있으니 나이스페이 상점관리자에서 확인한 뒤 예약 상태를 직접 바꿔 주세요.",
        },
        { status: 502 }
      );
    }

    const code = String(result.ResultCode ?? "");
    console.log("[admin/cancel] nicepay result", {
      id,
      tid: r.payment_tid,
      code,
      msg: result.ResultMsg,
      cancelAmt: result.CancelAmt,
    });

    if (!CANCEL_OK.has(code)) {
      // 명확한 실패 → 아무것도 바뀌지 않음, 재시도 가능
      return NextResponse.json(
        { error: `카드 취소 실패: ${result.ResultMsg ?? "알 수 없는 오류"} (${code})` },
        { status: 400 }
      );
    }

    // ── 성공: 기록 → 상태 변경 → 좌석 복구 → 문자 ──────────────────
    const summary =
      `${refundAmount.toLocaleString()}원 ${isPartial ? "부분" : "전액"}환불` +
      (fee > 0 ? ` (공제 ${fee.toLocaleString()}원)` : "") +
      (reason ? ` · ${reason}` : "");

    const { error: logErr } = await sb.from("reservation_change_logs").insert({
      reservation_id: id,
      changed_by: "admin",
      admin_id: "admin",
      field: LOG_OK,
      old_value: `${r.total_amount.toLocaleString()}원 결제`,
      new_value: summary,
    });
    if (logErr) console.error("[admin/cancel] CRITICAL 취소 성공했으나 이력 기록 실패", { id, logErr });

    const prevStatus = r.status;
    const { error: upErr } = await sb
      .from("reservations")
      .update({ status: "refunded", updated_at: new Date().toISOString() })
      .eq("id", id);
    if (upErr) {
      console.error("[admin/cancel] CRITICAL 취소 성공했으나 상태 변경 실패 — 수동으로 '환불' 처리 필요", {
        id,
        upErr,
      });
      return NextResponse.json({
        ok: true,
        warning: "카드 취소는 완료됐지만 예약 상태 변경에 실패했습니다. 상태를 '환불'로 직접 바꿔 주세요.",
        summary,
      });
    }

    if (r.departure_id && ["paid", "confirmed"].includes(prevStatus)) {
      const seats = (r.adult_count ?? 0) + (r.child_count ?? 0) + (r.infant_count ?? 0);
      const { error: seatErr } = await sb.rpc("increment_reserved_seats", {
        dep_id: r.departure_id,
        cnt: -seats,
      });
      if (seatErr) console.error("[admin/cancel] 좌석 복구 실패 — 수동 보정 필요", { id, seatErr });
    }

    let smsSent = false;
    if (notify && r.customer_phone) {
      const text = [
        `[소망투어] 예약이 취소되었습니다.`,
        r.product?.title ? `상품: ${r.product.title}` : null,
        r.departure?.departure_date ? `출발일: ${r.departure.departure_date}` : null,
        `예약번호: ${String(r.id).slice(0, 8).toUpperCase()}`,
        `결제금액: ${r.total_amount.toLocaleString()}원`,
        fee > 0 ? `취소수수료: ${fee.toLocaleString()}원` : null,
        `환불금액: ${refundAmount.toLocaleString()}원`,
        `카드사 사정에 따라 환불 반영까지 영업일 3~5일 소요될 수 있습니다.`,
        `문의: 010-4797-0718`,
      ]
        .filter(Boolean)
        .join("\n");
      const s = await sendSms(r.customer_phone, text);
      smsSent = s.ok;
      if (!s.ok) console.error("[admin/cancel] 취소 문자 발송 실패", { id, s });
    }

    return NextResponse.json({ ok: true, summary, smsSent });
  } catch (e: any) {
    console.error("[admin/cancel POST]", e);
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  } finally {
    inFlight.delete(id);
  }
}
