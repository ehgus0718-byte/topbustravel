"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Departure, ProductDetail } from "@/types";
import { won, fmtDate, formatPhone } from "@/lib/format";

/**
 * 나이스페이 구모듈(웹표준 결제창) 연동 — 대전빵버스 검증 패턴 이식
 * - 스크립트: pg-web.nicepay.co.kr/v3/common/js/nicepay-pgweb.js
 * - PC: goPay() 레이어 → 인증 완료 시 nicepaySubmit() → 폼을 ReturnURL로 전체 페이지 POST
 * - 모바일: goPay()가 모바일 결제 페이지로 이동 → 나이스페이가 ReturnURL로 직접 POST
 * - 서명(SignData)은 서버(/api/reservations)에서 생성 (상점키는 서버에만 존재)
 */

declare global {
  interface Window {
    goPay?: (form: HTMLFormElement) => void;
    nicepaySubmit?: () => void;
    nicepayClose?: () => void;
    deleteLayer?: () => void;
  }
}

function loadNicepayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById("nicepay-script")) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.id = "nicepay-script";
    s.src = "https://pg-web.nicepay.co.kr/v3/common/js/nicepay-pgweb.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("script load failed"));
    document.head.appendChild(s);
  });
}

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function safeRemove(el: HTMLElement | null) {
  try {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  } catch {}
}

export default function ReserveClient({
  product,
  departure,
  initialAdult = 1,
  initialChild = 0,
  initialInfant = 0,
}: {
  product: ProductDetail;
  departure: Departure;
  initialAdult?: number;
  initialChild?: number;
  initialInfant?: number;
}) {
  const router = useRouter();
  const [adult, setAdult] = useState(initialAdult);
  const [child, setChild] = useState(initialChild);
  const [infant, setInfant] = useState(initialInfant);
  const [boardingId, setBoardingId] = useState<string | null>(
    product.boarding_points[0]?.id ?? null
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [memo, setMemo] = useState("");
  const [payMethod, setPayMethod] = useState<"card" | "bank">("card");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  // 결제 모듈 미리 로드 (빵버스 패턴)
  useEffect(() => {
    loadNicepayScript().catch(() => {});
  }, []);

  const prices = {
    adult: departure.adult_price ?? product.base_price,
    child: departure.child_price ?? product.child_price ?? product.base_price,
    infant: departure.infant_price ?? product.infant_price ?? 0,
  };

  const total = useMemo(
    () => adult * prices.adult + child * prices.child + infant * prices.infant,
    [adult, child, infant, prices.adult, prices.child, prices.infant]
  );

  const remaining = Math.max(departure.total_seats - departure.reserved_seats, 0);
  const totalPeople = adult + child + infant;

  const submit = async () => {
    if (!name.trim()) return alert("예약자 이름을 입력해 주세요.");
    if (phone.replace(/\D/g, "").length < 10)
      return alert("연락처를 정확히 입력해 주세요.");
    if (product.boarding_points.length > 0 && !boardingId)
      return alert("탑승지를 선택해 주세요.");
    if (totalPeople > remaining)
      return alert(`잔여 좌석이 ${remaining}석입니다. 인원을 조정해 주세요.`);
    if (!agreed) return alert("취소/환불 규정에 동의해 주세요.");

    setBusy(true);
    try {
      // 1) 서버에서 pending 예약 생성 + 결제창 서명 파라미터 수신
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departure_id: departure.id,
          boarding_point_id: boardingId,
          customer_name: name.trim(),
          customer_phone: phone,
          adult_count: adult,
          child_count: child,
          infant_count: infant,
          request_memo: memo.trim() || null,
          payment_method: payMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "예약 생성에 실패했습니다.");

      // 2-a) 무통장: 완료 페이지로
      if (payMethod === "bank") {
        router.push(`/reservation/complete?id=${data.id}`);
        return;
      }

      // 2-b) 카드: 나이스페이 구모듈 결제창 (Moid = 예약 UUID)
      try {
        await loadNicepayScript();
      } catch {
        throw new Error("결제 모듈을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.");
      }
      if (typeof window.goPay !== "function") {
        throw new Error("결제 모듈을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.");
      }

      const formEl = document.createElement("form");
      formEl.name = "nicepayForm";
      formEl.method = "post";
      formEl.acceptCharset = "euc-kr";
      formEl.style.display = "none";
      formEl.action = data.returnUrl; // 인증 결과를 받을 곳 (PC/모바일 공통)

      const fields: Record<string, string> = {
        PayMethod: "CARD",
        GoodsName: data.goodsName,
        Amt: data.amt,
        MID: data.mid,
        Moid: data.id,
        BuyerName: name.trim(),
        BuyerTel: phone.replace(/\D/g, ""),
        EdiDate: data.ediDate,
        SignData: data.signData,
        CharSet: "utf-8",
        GoodsCl: "1",
        TransType: "0",
        ReturnURL: data.returnUrl,
      };
      Object.entries(fields).forEach(([k, v]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = k;
        input.value = v;
        formEl.appendChild(input);
      });
      document.body.appendChild(formEl);

      // PC: 인증 완료 시 SDK가 폼에 인증 결과를 채운 뒤 호출 → 그대로 서버로 전체 페이지 POST
      window.nicepaySubmit = function () {
        window.deleteLayer?.();
        delete window.nicepaySubmit;
        delete window.nicepayClose;
        formEl.submit(); // → /api/payments/return (서버 승인 후 완료/실패 페이지로 303)
      };

      // PC: 결제창 닫힘/취소
      window.nicepayClose = function () {
        window.deleteLayer?.();
        safeRemove(formEl);
        delete window.nicepaySubmit;
        delete window.nicepayClose;
        setBusy(false);
        alert("결제가 취소되었습니다.");
      };

      try {
        window.goPay(formEl); // PC: 레이어 / 모바일: 결제 페이지로 이동
      } catch {
        safeRemove(formEl);
        throw new Error("결제창 호출에 실패했습니다. 팝업 차단을 해제해 주세요.");
      }

      // 모바일은 페이지가 이동하므로 busy 상태 유지 (이동 실패 대비 15초 후 해제)
      if (isMobileDevice()) {
        setTimeout(() => setBusy(false), 15000);
      }
    } catch (e: any) {
      alert(e.message || "오류가 발생했습니다.");
      setBusy(false);
    }
  };

  return (
    <div className="pb-32">
      <div className="px-4 pt-5">
        <h1 className="text-[20px] font-extrabold">예약하기</h1>
      </div>

      {/* 상품 요약 */}
      <div className="mx-4 mt-4 rounded-2xl bg-canvas p-4">
        <p className="text-[12px] font-semibold text-primary">{product.duration_text}</p>
        <p className="mt-0.5 text-[15px] font-bold leading-snug">{product.title}</p>
        <p className="mt-1.5 text-[13px] font-semibold text-sub">
          🚌 {fmtDate(departure.departure_date)} 출발 · 잔여 {remaining}석
        </p>
      </div>

      {/* 인원 선택 */}
      <Section title="인원 선택">
        <Counter
          label="성인"
          sub={won(prices.adult)}
          value={adult}
          min={1}
          onChange={setAdult}
        />
        <Counter
          label="아동"
          sub={won(prices.child)}
          value={child}
          min={0}
          onChange={setChild}
        />
        <Counter
          label="유아"
          sub={prices.infant > 0 ? won(prices.infant) : "무료"}
          value={infant}
          min={0}
          onChange={setInfant}
        />
      </Section>

      {/* 탑승지 */}
      {product.boarding_points.length > 0 && (
        <Section title="탑승지 선택">
          <div className="space-y-2">
            {product.boarding_points.map((b) => (
              <button
                key={b.id}
                onClick={() => setBoardingId(b.id)}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left transition ${
                  boardingId === b.id
                    ? "border-primary bg-primary-soft"
                    : "border-line bg-white"
                }`}
              >
                <span
                  className={`text-[14px] font-semibold ${
                    boardingId === b.id ? "text-primary" : "text-ink"
                  }`}
                >
                  {b.name}
                </span>
                <span className="text-[13px] font-bold text-sub">
                  {b.boarding_time}
                </span>
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* 예약자 정보 */}
      <Section title="예약자 정보">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="이름"
          className="w-full rounded-xl border border-line px-4 py-3.5 text-[15px] outline-none focus:border-primary"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          placeholder="휴대폰 번호"
          inputMode="numeric"
          className="mt-2.5 w-full rounded-xl border border-line px-4 py-3.5 text-[15px] outline-none focus:border-primary"
        />
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="요청사항 (선택)"
          rows={2}
          className="mt-2.5 w-full rounded-xl border border-line px-4 py-3.5 text-[15px] outline-none focus:border-primary"
        />
      </Section>

      {/* 결제 수단 */}
      <Section title="결제 수단">
        <div className="grid grid-cols-2 gap-2">
          <PayOption
            label="카드 결제"
            sub="나이스페이 안전결제"
            active={payMethod === "card"}
            onClick={() => setPayMethod("card")}
          />
          <PayOption
            label="무통장 입금"
            sub="입금 확인 후 확정"
            active={payMethod === "bank"}
            onClick={() => setPayMethod("bank")}
          />
        </div>
      </Section>

      {/* 금액 요약 */}
      <Section title="결제 금액">
        <div className="space-y-1.5 rounded-2xl bg-canvas p-4 text-[14px]">
          {adult > 0 && <Row label={`성인 ${adult}명`} value={won(adult * prices.adult)} />}
          {child > 0 && <Row label={`아동 ${child}명`} value={won(child * prices.child)} />}
          {infant > 0 && <Row label={`유아 ${infant}명`} value={won(infant * prices.infant)} />}
          <div className="!mt-3 flex items-center justify-between border-t border-line pt-3">
            <span className="font-bold">총 결제 금액</span>
            <span className="text-[18px] font-extrabold text-primary">{won(total)}</span>
          </div>
        </div>
        <label className="mt-4 flex items-start gap-2.5 px-1">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4.5 w-4.5 accent-primary"
          />
          <span className="text-[13px] leading-relaxed text-sub">
            상품의 <b className="text-ink">취소/환불 규정</b>을 확인했으며 이에
            동의합니다. (상세 페이지 하단 참고)
          </span>
        </label>
      </Section>

      {/* 하단 CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] border-t border-line bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2.5">
        <button
          onClick={submit}
          disabled={busy}
          className="h-13 w-full rounded-xl bg-primary py-3.5 text-[15px] font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
        >
          {busy
            ? "처리 중..."
            : payMethod === "card"
              ? `${won(total)} 결제하기`
              : `${won(total)} 예약 신청하기`}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t-8 border-canvas px-4 py-5 first-of-type:border-t-0">
      <h2 className="mb-3.5 text-[16px] font-extrabold">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sub">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function Counter({
  label,
  sub,
  value,
  min,
  onChange,
}: {
  label: string;
  sub: string;
  value: number;
  min: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-[15px] font-semibold">{label}</p>
        <p className="text-[12px] text-faint">{sub}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`${label} 줄이기`}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-[18px] text-sub disabled:opacity-30"
        >
          −
        </button>
        <span className="w-6 text-center text-[16px] font-bold">{value}</span>
        <button
          onClick={() => onChange(value + 1)}
          aria-label={`${label} 늘리기`}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-[18px] text-sub"
        >
          +
        </button>
      </div>
    </div>
  );
}

function PayOption({
  label,
  sub,
  active,
  onClick,
}: {
  label: string;
  sub: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-3 py-3.5 text-left transition ${
        active ? "border-primary bg-primary-soft" : "border-line bg-white"
      }`}
    >
      <p className={`text-[14px] font-bold ${active ? "text-primary" : "text-ink"}`}>
        {label}
      </p>
      <p className="mt-0.5 text-[11.5px] text-faint">{sub}</p>
    </button>
  );
}
