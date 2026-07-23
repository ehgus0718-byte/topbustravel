"use client";
import { useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import type { Review } from "@/types";
import { fmtDateTime, maskName } from "@/lib/format";

type SortMode = "latest" | "rating" | "photo";

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
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sort, setSort] = useState<SortMode>("latest");
  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number } | null>(null);

  const sorted = useMemo(() => {
    const base = sort === "photo" ? reviews.filter((r) => r.image_urls?.length > 0) : reviews;
    const copy = [...base];
    if (sort === "rating") copy.sort((a, b) => b.rating - a.rating);
    else copy.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return copy;
  }, [reviews, sort]);

  const photoCount = useMemo(() => reviews.filter((r) => r.image_urls?.length > 0).length, [reviews]);

  const openForm = () => {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setOpen(true);
  };

  const addPhoto = async (file: File) => {
    if (photos.length >= 3) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/reviews/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPhotos((p) => [...p, data.url]);
    } catch (e: any) {
      alert(e.message || "사진 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
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
        body: JSON.stringify({ product_id: productId, ...form, image_urls: photos }),
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
      {reviews.length > 0 && (
        <div className="mb-3.5 flex gap-1.5">
          <SortTab active={sort === "latest"} onClick={() => setSort("latest")} label="최신순" />
          <SortTab active={sort === "rating"} onClick={() => setSort("rating")} label="평점순" />
          {photoCount > 0 && (
            <SortTab
              active={sort === "photo"}
              onClick={() => setSort("photo")}
              label={`사진 후기 (${photoCount})`}
            />
          )}
        </div>
      )}

      {reviews.length === 0 ? (
        <p className="py-6 text-center text-sm text-faint">
          아직 등록된 후기가 없습니다. 첫 후기를 남겨주세요!
        </p>
      ) : sorted.length === 0 ? (
        <p className="py-6 text-center text-sm text-faint">사진이 첨부된 후기가 아직 없어요.</p>
      ) : (
        <ul className="space-y-4">
          {sorted.map((r) => (
            <li key={r.id} className="rounded-2xl bg-canvas p-4">
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-bold">{r.author_name}</p>
                <p className="text-[13px] font-bold text-accent">
                  {"★".repeat(r.rating)}
                  <span className="text-line">{"★".repeat(5 - r.rating)}</span>
                </p>
              </div>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink">{r.content}</p>

              {r.image_urls?.length > 0 && (
                <div className="mt-2.5 flex gap-1.5">
                  {r.image_urls.slice(0, 6).map((url, i) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setLightbox({ urls: r.image_urls, index: i })}
                      className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white md:h-20 md:w-20"
                    >
                      <Image src={url} alt="후기 사진" fill sizes="80px" className="object-cover" />
                    </button>
                  ))}
                </div>
              )}

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
            {photos.map((url) => (
              <div key={url} className="relative h-16 w-16 overflow-hidden rounded-lg bg-canvas">
                <Image src={url} alt="첨부 사진" fill sizes="64px" className="object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos((p) => p.filter((u) => u !== url))}
                  aria-label="사진 제거"
                  className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink/70 text-[11px] text-white"
                >
                  ✕
                </button>
              </div>
            ))}
            {photos.length < 3 && (
              <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-line text-faint">
                <span className="text-[11px] font-semibold">
                  {uploading ? "업로드 중" : `+ 사진 (${photos.length}/3)`}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) addPhoto(f);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>

          <div className="mt-2.5 flex gap-2">
            <button
              onClick={() => setOpen(false)}
              className="h-11 flex-1 rounded-xl border border-line text-[14px] font-semibold text-sub"
            >
              취소
            </button>
            <button
              onClick={submit}
              disabled={busy || uploading}
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

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            aria-label="닫기"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
            onClick={() => setLightbox(null)}
          >
            ✕
          </button>
          <div className="relative h-[70vh] w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <Image
              src={lightbox.urls[lightbox.index]}
              alt="후기 사진 확대"
              fill
              sizes="90vw"
              className="object-contain"
            />
          </div>
          {lightbox.urls.length > 1 && (
            <>
              <button
                type="button"
                aria-label="이전 사진"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((v) =>
                    v ? { ...v, index: (v.index - 1 + v.urls.length) % v.urls.length } : v
                  );
                }}
                className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="다음 사진"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((v) => (v ? { ...v, index: (v.index + 1) % v.urls.length } : v));
                }}
                className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white"
              >
                ›
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SortTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
        active ? "bg-ink text-white" : "border border-line text-sub hover:border-primary hover:text-primary"
      }`}
    >
      {label}
    </button>
  );
}
