"use client";
import { useState } from "react";
import { formatPhone } from "@/lib/format";

export default function ContactClient({
  tel,
  kakaoUrl,
}: {
  tel: string;
  kakaoUrl: string;
}) {
  const [form, setForm] = useState({ name: "", phone: "", message: "" });
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!form.name.trim() || form.phone.replace(/\D/g, "").length < 10 || !form.message.trim()) {
      alert("이름, 연락처, 문의 내용을 모두 입력해 주세요.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setSent(true);
    } catch {
      alert("접수에 실패했습니다. 전화로 문의해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-4 py-6 pb-24">
      <h1 className="text-[22px] font-extrabold">문의하기</h1>
      <p className="mt-1 text-[13px] text-faint">
        단체 대절, 맞춤 일정도 편하게 문의해 주세요.
      </p>

      {/* 빠른 문의 */}
      <div className="mt-5 grid grid-cols-2 gap-2">
        <a
          href={`tel:${tel.replace(/-/g, "")}`}
          className="flex h-14 flex-col items-center justify-center rounded-2xl bg-primary text-white active:scale-[0.98] transition"
        >
          <span className="text-[14px] font-bold">📞 전화 문의</span>
          <span className="text-[11px] text-white/80">{tel}</span>
        </a>
        <a
          href={kakaoUrl}
          target="_blank"
          rel="noreferrer"
          className="flex h-14 flex-col items-center justify-center rounded-2xl bg-[#FEE500] text-[#191919] active:scale-[0.98] transition"
        >
          <span className="text-[14px] font-bold">💬 카카오톡 문의</span>
          <span className="text-[11px] opacity-70">평일 09:00~18:00</span>
        </a>
      </div>

      {/* 문의 폼 */}
      {sent ? (
        <div className="mt-8 rounded-2xl bg-primary-soft p-6 text-center">
          <p className="text-[16px] font-bold text-primary">문의가 접수되었습니다</p>
          <p className="mt-1.5 text-[13px] text-sub">
            빠른 시간 내에 연락드리겠습니다.
          </p>
        </div>
      ) : (
        <div className="mt-8">
          <h2 className="text-[16px] font-extrabold">문의 남기기</h2>
          <div className="mt-3 space-y-2.5">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="이름"
              className="w-full rounded-xl border border-line px-4 py-3.5 text-[15px] outline-none focus:border-primary"
            />
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
              placeholder="연락처"
              inputMode="numeric"
              className="w-full rounded-xl border border-line px-4 py-3.5 text-[15px] outline-none focus:border-primary"
            />
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="문의 내용 (희망 날짜, 인원, 지역 등을 적어주시면 더 빠르게 안내드릴 수 있어요)"
              rows={5}
              className="w-full rounded-xl border border-line px-4 py-3.5 text-[15px] outline-none focus:border-primary"
            />
            <button
              onClick={submit}
              disabled={busy}
              className="h-13 w-full rounded-xl bg-ink py-3.5 text-[15px] font-bold text-white disabled:opacity-60"
            >
              {busy ? "접수 중..." : "문의 접수하기"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
