"use client";
import { useEffect, useState } from "react";
import AdminNav from "../AdminNav";
import { fmtDateTime } from "@/lib/format";

type PopupItem = {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  link_url: string | null;
  starts_on: string | null;
  ends_on: string | null;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
};

const EMPTY = {
  title: "",
  content: "",
  image_url: "",
  link_url: "",
  starts_on: "",
  ends_on: "",
  sort_order: 0,
  is_visible: true,
};

export default function AdminPopupsPage() {
  const [list, setList] = useState<PopupItem[] | null>(null);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState("");

  const load = () =>
    fetch("/api/admin/popups")
      .then((r) => r.json())
      .then((d) => setList(d.popups ?? []));

  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const openNew = () => {
    setForm(EMPTY);
    setEditing("new");
  };
  const openEdit = (p: PopupItem) => {
    setForm({
      title: p.title,
      content: p.content,
      image_url: p.image_url ?? "",
      link_url: p.link_url ?? "",
      starts_on: p.starts_on ?? "",
      ends_on: p.ends_on ?? "",
      sort_order: p.sort_order ?? 0,
      is_visible: p.is_visible,
    });
    setEditing(p.id);
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "업로드 실패");
      setForm((f) => ({ ...f, image_url: data.url }));
      setToast("이미지를 업로드했습니다");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.title.trim()) return alert("제목을 입력해 주세요.");
    if (form.starts_on && form.ends_on && form.starts_on > form.ends_on) {
      return alert("종료일이 시작일보다 빠릅니다.");
    }
    setSaving(true);
    try {
      const url = editing === "new" ? "/api/admin/popups" : `/api/admin/popups/${editing}`;
      const method = editing === "new" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error || "저장 실패");
      setToast(editing === "new" ? "팝업을 등록했습니다" : "수정했습니다");
      setEditing(null);
      load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("이 팝업을 삭제할까요? 되돌릴 수 없습니다.")) return;
    await fetch(`/api/admin/popups/${id}`, { method: "DELETE" });
    setToast("삭제했습니다");
    load();
  };

  return (
    <div>
      <AdminNav />
      <div className="p-4">
        <div className="mb-1 flex items-center justify-between">
          <h1 className="text-[17px] font-extrabold">
            홈 팝업{" "}
            {list && <span className="text-[13px] font-semibold text-faint">({list.length})</span>}
          </h1>
          <button
            onClick={openNew}
            className="rounded-lg bg-primary px-3 py-1.5 text-[13px] font-bold text-white"
          >
            + 팝업 만들기
          </button>
        </div>
        <p className="mb-3 text-[12px] text-faint">
          홈 첫 화면에 표시됩니다. PC는 중앙 카드, 모바일은 하단 시트로 나타납니다.
        </p>

        {editing && (
          <div className="mb-4 rounded-2xl border border-primary/30 bg-primary-soft/40 p-4">
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="팝업 제목"
              className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[14px] font-semibold outline-none focus:border-primary"
            />

            {/* 이미지 */}
            <div className="mt-2.5">
              {form.image_url ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.image_url}
                    alt="팝업 이미지 미리보기"
                    className="w-full rounded-lg border border-line object-cover"
                  />
                  <button
                    onClick={() => setForm({ ...form, image_url: "" })}
                    className="absolute right-2 top-2 rounded-lg bg-ink/70 px-2 py-1 text-[12px] font-bold text-white"
                  >
                    제거
                  </button>
                </div>
              ) : (
                <label className="flex h-24 cursor-pointer items-center justify-center rounded-lg border border-dashed border-line bg-white text-[13px] font-semibold text-sub">
                  {uploading ? "업로드 중..." : "📷 팝업 이미지 업로드 (선택)"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadImage(f);
                    }}
                  />
                </label>
              )}
            </div>

            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="팝업 내용 (선택)"
              rows={4}
              className="mt-2.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[14px] outline-none focus:border-primary"
            />

            <input
              value={form.link_url}
              onChange={(e) => setForm({ ...form, link_url: e.target.value })}
              placeholder="자세히 보기 링크 (선택, 예: /products/namhae-yeosu-2days 또는 https://...)"
              className="mt-2.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[13px] outline-none focus:border-primary"
            />

            {/* 노출 기간 + 정렬 */}
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[13px]">
              <input
                type="date"
                value={form.starts_on}
                onChange={(e) => setForm({ ...form, starts_on: e.target.value })}
                className="rounded-lg border border-line bg-white px-2.5 py-2"
              />
              <span className="text-faint">~</span>
              <input
                type="date"
                value={form.ends_on}
                onChange={(e) => setForm({ ...form, ends_on: e.target.value })}
                className="rounded-lg border border-line bg-white px-2.5 py-2"
              />
              <label className="ml-auto flex items-center gap-1.5">
                <span className="text-faint">표시순서</span>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                  className="w-16 rounded-lg border border-line bg-white px-2.5 py-2 text-center"
                />
              </label>
            </div>
            <p className="mt-1.5 text-[11px] text-faint">
              날짜를 비우면 기간 제한 없이 노출됩니다. 표시순서는 숫자가 낮을수록 먼저 보입니다.
            </p>

            <label className="mt-2.5 flex items-center gap-1.5 text-[13px] font-semibold">
              <input
                type="checkbox"
                checked={form.is_visible}
                onChange={(e) => setForm({ ...form, is_visible: e.target.checked })}
                className="accent-primary"
              />
              공개
            </label>

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setEditing(null)}
                className="h-10 flex-1 rounded-lg border border-line text-[13px] font-semibold text-sub"
              >
                취소
              </button>
              <button
                onClick={save}
                disabled={saving || uploading}
                className="h-10 flex-1 rounded-lg bg-primary text-[13px] font-bold text-white disabled:opacity-50"
              >
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        )}

        {list === null ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-canvas" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((p) => (
              <div key={p.id} className="overflow-hidden rounded-xl border border-line">
                {p.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt={p.title} className="h-32 w-full object-cover" />
                )}
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[14px] font-bold">
                      <span className="mr-1.5 text-[12px] font-semibold text-faint">
                        #{p.sort_order}
                      </span>
                      {p.title}
                    </p>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span
                        className={`rounded-lg px-2 py-1 text-[11px] font-bold ${
                          p.is_visible ? "bg-primary-soft text-primary" : "bg-canvas text-faint"
                        }`}
                      >
                        {p.is_visible ? "공개" : "비공개"}
                      </span>
                      <button onClick={() => openEdit(p)} className="text-[12px] text-sub">
                        수정
                      </button>
                      <button onClick={() => remove(p.id)} className="text-[12px] text-danger">
                        삭제
                      </button>
                    </div>
                  </div>
                  {(p.starts_on || p.ends_on) && (
                    <p className="mt-1 text-[12px] font-semibold text-primary">
                      {p.starts_on ?? "제한없음"} ~ {p.ends_on ?? "제한없음"}
                    </p>
                  )}
                  {p.link_url && (
                    <p className="mt-1 truncate text-[12px] text-sub">🔗 {p.link_url}</p>
                  )}
                  {p.content && (
                    <p className="mt-1 line-clamp-2 text-[12px] text-sub">{p.content}</p>
                  )}
                  <p className="mt-1 text-[11px] text-faint">{fmtDateTime(p.created_at)}</p>
                </div>
              </div>
            ))}
            {list.length === 0 && (
              <p className="py-10 text-center text-sm text-faint">
                등록된 팝업이 없습니다. 팝업을 만들어 보세요.
              </p>
            )}
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="rounded-full bg-ink px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
