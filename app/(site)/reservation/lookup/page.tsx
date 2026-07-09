"use client";
import { useState } from "react";
import Link from "next/link";
import { won, fmtDate, formatPhone, STATUS_LABEL } from "@/lib/format";

export default function LookupPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [results, setResults] = useState<any[] | null>(null);
  const [busy, setBusy] = useState(false);

  const search = async () => {
    if (!name.trim() || phone.replace(/\D/g, "").length < 10) {
      alert("이름과 휴대폰 번호를 입력해 주세요.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/reservations/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone }),
      });
      const data = await res.json();
      setResults(data.reservations ?? []);
    } catch {
      alert("조회에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-4 py-6 pb-24">
      <h1 className="text-[22px] font-extrabold">예약조회</h1>
      <p className="mt-1 text-[13px] text-faint">
        예약 시 입력한 이름과 휴대폰 번호로 조회할 수 있습니다.
      </p>

      <div className="mt-5 space-y-2.5">
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
          className="w-full rounded-xl border border-line px-4 py-3.5 text-[15px] outline-none focus:border-primary"
        />
        <button
          onClick={search}
          disabled={busy}
          className="h-13 w-full rounded-xl bg-primary py-3.5 text-[15px] font-bold text-white disabled:opacity-60"
        >
          {busy ? "조회 중..." : "예약 조회하기"}
        </button>
      </div>

      {results !== null && (
        <div className="mt-6">
          {results.length === 0 ? (
            <p className="py-10 text-center text-sm text-faint">
              조회된 예약이 없습니다.
            </p>
          ) : (
            <ul className="space-y-3">
              {results.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/reservation/complete?id=${r.id}`}
                    className="block rounded-2xl border border-line p-4 active:bg-canvas"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                          r.status === "paid" || r.status === "confirmed"
                            ? "bg-primary-soft text-primary"
                            : r.status === "pending"
                              ? "bg-accent/10 text-accent"
                              : "bg-canvas text-faint"
                        }`}
                      >
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                      <span className="text-[12px] text-faint">
                        No. {r.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                    <p className="mt-2 text-[15px] font-bold leading-snug">
                      {r.product?.title ?? "-"}
                    </p>
                    <p className="mt-1 text-[13px] text-sub">
                      {r.departure ? fmtDate(r.departure.departure_date) : "-"} 출발 ·{" "}
                      {won(r.total_amount)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
