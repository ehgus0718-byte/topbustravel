"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPhone } from "@/lib/format";

type Mode = null | "name" | "phone" | "withdraw";

export default function AccountSettings({
  initialName,
  initialPhone,
}: {
  initialName: string;
  initialPhone: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <>
      <div className="mt-4 rounded-2xl border border-line">
        <Row label="이름" value={name} onEdit={() => setMode("name")} />
        <div className="h-px bg-line" />
        <Row label="휴대폰 번호" value={formatPhone(phone)} onEdit={() => setMode("phone")} />
      </div>

      <button
        onClick={() => setMode("withdraw")}
        className="mt-5 text-[12px] text-faint underline underline-offset-2"
      >
        회원탈퇴
      </button>

      {mode === "name" && (
        <NameModal
          current={name}
          onClose={() => setMode(null)}
          onDone={(v) => {
            setName(v);
            setMode(null);
            setToast("이름을 변경했습니다");
            router.refresh();
          }}
        />
      )}
      {mode === "phone" && (
        <PhoneModal
          current={phone}
          onClose={() => setMode(null)}
          onDone={(v) => {
            setPhone(v);
            setMode(null);
            setToast("휴대폰 번호를 변경했습니다");
            router.refresh();
          }}
        />
      )}
      {mode === "withdraw" && <WithdrawModal onClose={() => setMode(null)} />}

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-ink px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}

function Row({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-[12px] text-faint">{label}</p>
        <p className="mt-0.5 truncate text-[15px] font-semibold text-ink">{value}</p>
      </div>
      <button
        onClick={onEdit}
        className="ml-3 shrink-0 rounded-lg border border-line px-3 py-1.5 text-[13px] font-semibold text-sub"
      >
        변경
      </button>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <div className="mb-3.5 flex items-center justify-between">
          <h3 className="text-[16px] font-extrabold">{title}</h3>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="flex h-8 w-8 items-center justify-center rounded-full text-faint"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function NameModal({
  current,
  onClose,
  onDone,
}: {
  current: string;
  onClose: () => void;
  onDone: (name: string) => void;
}) {
  const [value, setValue] = useState(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/account/name", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onDone(data.name);
    } catch (e: any) {
      setError(e.message || "변경에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="이름 변경" onClose={onClose}>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="이름"
        className="h-12 w-full min-w-0 rounded-xl border border-line px-4 text-[16px] outline-none focus:border-primary"
      />
      {error && <p className="mt-2 text-[13px] font-semibold text-accent">{error}</p>}
      <button
        onClick={save}
        disabled={busy || value.trim().length < 2}
        className="mt-3 h-12 w-full rounded-xl bg-primary text-[15px] font-bold text-white disabled:opacity-40"
      >
        {busy ? "저장 중..." : "저장"}
      </button>
    </Modal>
  );
}

function PhoneModal({
  current,
  onClose,
  onDone,
}: {
  current: string;
  onClose: () => void;
  onDone: (phone: string) => void;
}) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const sendCode = async () => {
    setBusy(true);
    setError("");
    try {
      const check = await fetch("/api/account/phone/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const cData = await check.json();
      if (!check.ok) throw new Error(cData.error);

      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep("code");
    } catch (e: any) {
      setError(e.message || "인증번호 발송에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/account/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onDone(data.phone);
    } catch (e: any) {
      setError(e.message || "변경에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="휴대폰 번호 변경" onClose={onClose}>
      <p className="mb-3 text-[13px] leading-relaxed text-sub">
        휴대폰 번호는 로그인에 사용됩니다. 새 번호로 인증을 받아야 변경할 수 있습니다.
      </p>
      <p className="mb-3 rounded-xl bg-canvas px-3.5 py-2.5 text-[13px] text-sub">
        현재 번호 <b className="text-ink">{formatPhone(current)}</b>
      </p>

      <input
        type="tel"
        inputMode="numeric"
        value={phone}
        disabled={step === "code"}
        onChange={(e) => setPhone(formatPhone(e.target.value))}
        placeholder="새 휴대폰 번호"
        className="h-12 w-full min-w-0 rounded-xl border border-line px-4 text-[16px] outline-none focus:border-primary disabled:bg-canvas disabled:text-faint"
      />

      {step === "code" && (
        <input
          inputMode="numeric"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="인증번호 6자리"
          className="mt-2 h-12 w-full min-w-0 rounded-xl border border-line px-4 text-[18px] font-bold tracking-[0.3em] outline-none focus:border-primary"
        />
      )}

      {error && <p className="mt-2 text-[13px] font-semibold text-accent">{error}</p>}

      {step === "phone" ? (
        <button
          onClick={sendCode}
          disabled={busy || phone.replace(/\D/g, "").length < 10}
          className="mt-3 h-12 w-full rounded-xl bg-primary text-[15px] font-bold text-white disabled:opacity-40"
        >
          {busy ? "발송 중..." : "인증번호 받기"}
        </button>
      ) : (
        <button
          onClick={verify}
          disabled={busy || code.length !== 6}
          className="mt-3 h-12 w-full rounded-xl bg-primary text-[15px] font-bold text-white disabled:opacity-40"
        >
          {busy ? "확인 중..." : "인증하고 변경"}
        </button>
      )}
    </Modal>
  );
}

function WithdrawModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ scheduledText: string; graceDays: number } | null>(null);

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/account/withdraw", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDone({ scheduledText: data.scheduledText, graceDays: data.graceDays });
    } catch (e: any) {
      setError(e.message || "탈퇴 신청에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <Modal title="탈퇴 신청이 접수되었습니다" onClose={() => router.push("/")}>
        <p className="text-[14px] leading-relaxed text-ink">
          <b>{done.scheduledText}</b>에 탈퇴 처리가 완료됩니다.
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-sub">
          그때까지는 마음이 바뀌시면 되돌릴 수 있습니다. 같은 번호로 로그인하시면 탈퇴 취소 안내가
          나옵니다.
        </p>
        <button
          onClick={() => router.push("/")}
          className="mt-4 h-12 w-full rounded-xl bg-primary text-[15px] font-bold text-white"
        >
          확인
        </button>
      </Modal>
    );
  }

  return (
    <Modal title="정말 탈퇴하시겠어요?" onClose={onClose}>
      <p className="text-[14px] leading-relaxed text-ink">
        신청 후 <b>3일 뒤</b>에 탈퇴가 완료됩니다. 그 전에 로그인하시면 언제든 취소할 수 있습니다.
      </p>
      <ul className="mt-3 space-y-1.5 rounded-xl bg-canvas px-4 py-3 text-[13px] leading-relaxed text-sub">
        <li>· 회원 정보와 찜한 여행이 삭제됩니다</li>
        <li>· 지난 예약 내역은 법령에 따라 일정 기간 보관됩니다</li>
        <li>· 출발 예정인 예약이 있으면 탈퇴할 수 없습니다</li>
      </ul>
      {error && <p className="mt-2.5 text-[13px] font-semibold text-accent">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button
          onClick={onClose}
          className="h-12 flex-1 rounded-xl bg-primary text-[15px] font-bold text-white"
        >
          계속 이용하기
        </button>
        <button
          onClick={submit}
          disabled={busy}
          className="h-12 flex-1 rounded-xl border border-line text-[15px] font-semibold text-sub disabled:opacity-50"
        >
          {busy ? "처리 중..." : "탈퇴 신청"}
        </button>
      </div>
    </Modal>
  );
}
