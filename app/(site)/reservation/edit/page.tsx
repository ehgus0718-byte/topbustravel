"use client";
import { useState } from "react";
import Link from "next/link";
import { formatPhone, fmtDate } from "@/lib/format";

/**
 * /reservation/edit — 예약 정보 수정 (성함/휴대폰 번호)
 * 1단계: 예약번호 + 현재 휴대폰 번호로 본인 확인
 * 2단계: 성함/번호 수정, 번호 변경 시 새 번호로 인증번호 확인 후 저장
 * 디자인: 예약조회/예약완료 페이지와 동일한 카드·버튼·입력창 스타일 재사용
 */

type Step = "verify" | "edit" | "done";

export default function ReservationEditPage() {
  const [step, setStep] = useState<Step>("verify");
  const [busy, setBusy] = useState(false);

  // 1단계 입력
  const [reservationNo, setReservationNo] = useState("");
  const [currentPhone, setCurrentPhone] = useState("");

  // 본인확인 결과
  const [editToken, setEditToken] = useState("");
  const [original, setOriginal] = useState<{
    no: string;
    customer_name: string;
    customer_phone: string;
    product_title: string;
    departure_date: string | null;
  } | null>(null);

  // 2단계 입력
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const digits = (v: string) => v.replace(/\D/g, "");
  const phoneChanged =
    original !== null && digits(phone) !== digits(original.customer_phone);

  const verify = async () => {
    if (!reservationNo.trim() || digits(currentPhone).length < 10) {
      alert("예약번호와 휴대폰 번호를 입력해 주세요.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/reservations/edit-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationNo: reservationNo.trim(),
          phone: currentPhone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "확인에 실패했습니다.");
        return;
      }
      setEditToken(data.editToken);
      setOriginal(data.reservation);
      setName(data.reservation.customer_name);
      setPhone(data.reservation.customer_phone);
      setStep("edit");
    } catch {
      alert("확인에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const sendOtp = async () => {
    if (digits(phone).length < 10) {
      alert("새 휴대폰 번호를 입력해 주세요.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/reservations/edit-send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editToken, newPhone: phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "인증번호 발송에 실패했습니다.");
        return;
      }
      setOtpSent(true);
      alert("새 휴대폰 번호로 인증번호를 발송했습니다. 3분 안에 입력해 주세요.");
    } catch {
      alert("인증번호 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!original) return;
    const nameChanged = name.trim() !== original.customer_name;
    if (!nameChanged && !phoneChanged) {
      alert("변경된 내용이 없습니다.");
      return;
    }
    if (!name.trim()) {
      alert("성함을 입력해 주세요.");
      return;
    }
    if (phoneChanged && !/^\d{6}$/.test(otpCode)) {
      alert("새 휴대폰 번호로 받은 인증번호 6자리를 입력해 주세요.");
      return;
    }
    if (!confirm("예약 정보를 수정하시겠습니까?")) return;

    setBusy(true);
    try {
      const res = await fetch("/api/reservations/edit-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          editToken,
          name: name.trim(),
          phone,
          otpCode: phoneChanged ? otpCode : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "수정에 실패했습니다.");
        return;
      }
      setStep("done");
    } catch {
      alert("수정에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  if (step === "done") {
    return (
      <div className="px-4 py-8">
        <div className="flex flex-col items-center py-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-[28px]">
            ✅
          </div>
          <h1 className="mt-4 text-[20px] font-extrabold">예약 정보 수정 완료</h1>
          <p className="mt-1.5 text-[14px] leading-relaxed text-sub">
            예약 정보가 정상적으로 변경되었습니다.
          </p>
        </div>
        <div className="rounded-2xl bg-canvas p-4">
          <Row label="예약번호" value={original?.no ?? "-"} />
          <Row label="성함" value={name.trim()} />
          <Row label="휴대폰 번호" value={formatPhone(phone)} />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <Link
            href="/reservation/lookup"
            className="flex h-12 items-center justify-center rounded-xl border border-line text-[14px] font-semibold text-sub"
          >
            예약조회
          </Link>
          <Link
            href="/"
            className="flex h-12 items-center justify-center rounded-xl bg-primary text-[14px] font-bold text-white"
          >
            홈으로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 pb-24">
      <h1 className="text-[22px] font-extrabold">예약 정보 수정</h1>
      <p className="mt-1 text-[13px] text-faint">
        {step === "verify"
          ? "예약번호와 예약 시 입력한 휴대폰 번호로 본인 확인 후 수정할 수 있습니다."
          : "성함과 휴대폰 번호를 수정할 수 있습니다."}
      </p>

      {step === "verify" && (
        <div className="mt-5 space-y-2.5">
          <input
            value={reservationNo}
            onChange={(e) =>
              setReservationNo(e.target.value.toUpperCase().slice(0, 8))
            }
            placeholder="예약번호 8자리 (예: A1B2C3D4)"
            className="w-full rounded-xl border border-line px-4 py-3.5 text-[15px] outline-none focus:border-primary"
          />
          <input
            value={currentPhone}
            onChange={(e) => setCurrentPhone(formatPhone(e.target.value))}
            placeholder="현재 등록된 휴대폰 번호"
            inputMode="numeric"
            className="w-full rounded-xl border border-line px-4 py-3.5 text-[15px] outline-none focus:border-primary"
          />
          <button
            onClick={verify}
            disabled={busy}
            className="h-13 w-full rounded-xl bg-primary py-3.5 text-[15px] font-bold text-white disabled:opacity-60"
          >
            {busy ? "확인 중..." : "본인 확인"}
          </button>
          <p className="pt-1 text-center text-[12px] text-faint">
            예약번호는 예약 완료 문자와 예약조회에서 확인할 수 있습니다.
          </p>
        </div>
      )}

      {step === "edit" && original && (
        <div className="mt-5">
          <div className="rounded-2xl bg-canvas p-4">
            <Row label="예약번호" value={original.no} />
            <Row label="상품" value={original.product_title} />
            <Row
              label="출발일"
              value={
                original.departure_date ? fmtDate(original.departure_date) : "-"
              }
            />
          </div>

          <div className="mt-4 space-y-2.5">
            <div>
              <label className="mb-1 block text-[13px] font-semibold text-sub">
                성함
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="성함"
                className="w-full rounded-xl border border-line px-4 py-3.5 text-[15px] outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-semibold text-sub">
                휴대폰 번호
              </label>
              <input
                value={phone}
                onChange={(e) => {
                  setPhone(formatPhone(e.target.value));
                  setOtpSent(false);
                  setOtpCode("");
                }}
                placeholder="휴대폰 번호"
                inputMode="numeric"
                className="w-full rounded-xl border border-line px-4 py-3.5 text-[15px] outline-none focus:border-primary"
              />
            </div>

            {phoneChanged && (
              <div className="rounded-2xl border border-line p-3.5">
                <p className="text-[13px] font-semibold">
                  휴대폰 번호를 변경하려면 <span className="text-primary">새 번호 인증</span>이
                  필요합니다.
                </p>
                <p className="mt-0.5 text-[12px] text-faint">
                  예약 안내 문자가 변경된 번호로 발송되므로, 번호 소유 확인을 위해
                  인증번호를 보내드립니다.
                </p>
                <div className="mt-2.5 flex gap-2">
                  <input
                    value={otpCode}
                    onChange={(e) =>
                      setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="인증번호 6자리"
                    inputMode="numeric"
                    className="min-w-0 flex-1 rounded-xl border border-line px-4 py-3 text-[15px] outline-none focus:border-primary"
                  />
                  <button
                    onClick={sendOtp}
                    disabled={busy}
                    className="shrink-0 rounded-xl border border-primary px-3.5 text-[13px] font-bold text-primary disabled:opacity-60"
                  >
                    {otpSent ? "재발송" : "인증번호 발송"}
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={submit}
              disabled={busy}
              className="h-13 w-full rounded-xl bg-primary py-3.5 text-[15px] font-bold text-white disabled:opacity-60"
            >
              {busy ? "수정 중..." : "수정하기"}
            </button>
            <p className="pt-1 text-center text-[12px] text-faint">
              예약 상태와 결제 정보는 변경되지 않습니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-[14px]">
      <span className="shrink-0 text-faint">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}
