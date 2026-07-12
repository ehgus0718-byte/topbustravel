"use client";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { Review } from "@/types";
import { fmtDateTime, maskName } from "@/lib/format";

export default function ReviewList({
  productId,
  reviews,
  user,
}: {
  productId: string;
  reviews: Review[];
  user?: { name: string } | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ rating: 5, content: "" });
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const openForm = () => {
    if (!user) {
      // 비로그인 시 작성 버튼을 누르면 로그인으로 안내 (백엔드에서도 재검증됨)
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setOpen(true);
  };

  const submit = async () => {
    if (!form.content.trim()) {
      alert("내용을 입력해 주세요.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, ...form }),
      });
      if (res.status === 401) {
        router.push(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }
      if (!res.ok) throw new Error();
      setSent(true);
      setOpen(false);
    } catch {
      alert("등록에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {reviews.length === 0 ? (
        <p className="py-6 text-center text-sm text-faint">
          아직 등록된 후기가 없습니다. 첫 후기를 남겨주세요!
        </p>
      ) : (
        <ul className="space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-2xl bg-canvas p-4">
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-bold">{r.author_name}</p>
                <p className="text-[13px] font-bold text-accent">
                  {"★".repeat(r.rating)}
                  <span className="text-line">{"★".repeat(5 - r.rating)}</span>
                </p>
              </div>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink">
                {r.content}
              </p>
              <p className="mt-2 text-[11px] text-faint">{fmtDateTime(r.created_at)}</p>
            </li>
          ))}
        </ul>
      )}

      {sent ? (
        <p className="mt-4 rounded-xl bg-primary-soft px-4 py-3 text-center text-[13px] font-semibold text-primary">
          후기가 접수되었습니다. 관리자 확인 후 게시됩니다.
        </p>
      ) : open ? (
        <div className="mt-4 rounded-2xl border border-line p-4">
          <p className="text-[13px] font-semibold text-sub">
            {maskName(user?.name || "")}님 이름으로 등록됩니다
          </p>
          <div className="mt-2.5 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setForm({ ...form, rating: n })}
                className={`text-[22px] ${n <= form.rating ? "text-accent" : "text-line"}`}
                aria-label={`별점 ${n}점`}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder="여행은 어떠셨나요?"
            rows={3}
            className="mt-2.5 w-full rounded-xl border border-line px-3.5 py-2.5 text-[14px] outline-none focus:border-primary"
          />
          <div className="mt-2.5 flex gap-2">
            <button
              onClick={() => setOpen(false)}
              className="h-11 flex-1 rounded-xl border border-line text-[14px] font-semibold text-sub"
            >
              취소
            </button>
            <button
              onClick={submit}
              disabled={busy}
              className="h-11 flex-1 rounded-xl bg-primary text-[14px] font-bold text-white disabled:opacity-50"
            >
              {busy ? "등록 중..." : "후기 등록"}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={openForm}
          className="mt-4 h-11 w-full rounded-xl border border-line text-[14px] font-semibold text-sub active:bg-canvas"
        >
          {user ? "후기 작성하기" : "로그인하고 후기 작성하기"}
        </button>
      )}
    </div>
  );
}
