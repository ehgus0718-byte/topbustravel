"use client";
import { useEffect, useState } from "react";
import AdminNav from "../AdminNav";
import { fmtDateTime } from "@/lib/format";

type EventItem = {
  id: string;
  title: string;
  content: string;
  banner_url: string | null;
  starts_on: string | null;
  ends_on: string | null;
  is_visible: boolean;
  created_at: string;
};

const EMPTY = {
  title: "",
  content: "",
  banner_url: "",
  starts_on: "",
  ends_on: "",
  is_visible: true,
};

export default function AdminEventsPage() {
  const [list, setList] = useState<EventItem[] | null>(null);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState("");

  const load = () =>
    fetch("/api/admin/events")
      .then((r) => r.json())
      .then((d) => setList(d.events ?? []));

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
  const openEdit = (e: EventItem) => {
    setForm({
      title: e.title,
      content: e.content,
      banner_url: e.banner_url ?? "",
      starts_on: e.starts_on ?? "",
      ends_on: e.ends_on ?? "",
      is_visible: e.is_visible,
    });
    setEditing(e.id);
  };

  const uploadBanner = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "업로드 실패");
      setForm((f) => ({ ...f, banner_url: data.url }));
      setToast("배너를 업로드했습니다");
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
      const url = editing === "new" ? "/api/admin/events" : `/api/admin/events/${editing}`;
      const method = editing === "new" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error || "저장 실패");
      setToast(editing === "new" ? "이벤트를 등록했습니다" : "수정했습니다");
      setEditing(null);
      load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("이 이벤트를 삭제할까요? 되돌릴 수 없습니다.")) return;
    await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
    setToast("삭제했습니다");
    load();
  };

  return (
    <div>
      <AdminNav />
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-[17px] font-extrabold">
            이벤트{" "}
            {list && <span className="text-[13px] font-semibold text-faint">({list.length})</span>}
          </h1>
          <button
            onClick={openNew}
            className="rounded-lg bg-primary px-3 py-1.5 text-[13px] font-bold text-white"
          >
            + 이벤트 작성
          </button>
        </div>

        {editing && (
          <div className="mb-4 rounded-2xl border border-primary/30 bg-primary-soft/40 p-4">
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="이벤트 제목"
              className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[14px] font-semibold outline-none focus:border-primary"
            />

            {/* 배너 이미지 */}
            <div className="mt-2.5">
              {form.banner_url ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.banner_url}
                    alt="배너 미리보기"
                    className="w-full rounded-lg border border-line object-cover"
                  />
                  <button
                    onClick={() => setForm({ ...form, banner_url: "" })}
                    className="absolute right-2 top-2 rounded-lg bg-ink/70 px-2 py-1 text-[12px] font-bold text-white"
                  >
                    제거
                  </button>
                </div>
              ) : (
                <label className="flex h-24 cursor-pointer items-center justify-center rounded-lg border border-dashed border-line bg-white text-[13px] font-semibold text-sub">
                  {uploading ? "업로드 중..." : "📷 배너 이미지 업로드"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadBanner(f);
                    }}
                  />
                </label>
              )}
            </div>

            {/* 기간 */}
            <div className="mt-2.5 flex items-center gap-2 text-[13px]">
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
            </div>

            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="이벤트 내용"
              rows={5}
              className="mt-2.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[14px] outline-none focus:border-primary"
            />

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
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-canvas" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((ev) => (
              <div key={ev.id} className="overflow-hidden rounded-xl border border-line">
                {ev.banner_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ev.banner_url} alt={ev.title} className="h-32 w-full object-cover" />
                )}
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[14px] font-bold">{ev.title}</p>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span
                        className={`rounded-lg px-2 py-1 text-[11px] font-bold ${
                          ev.is_visible ? "bg-primary-soft text-primary" : "bg-canvas text-faint"
                        }`}
                      >
                        {ev.is_visible ? "공개" : "비공개"}
                      </span>
                      <button onClick={() => openEdit(ev)} className="text-[12px] text-sub">
                        수정
                      </button>
                      <button onClick={() => remove(ev.id)} className="text-[12px] text-danger">
                        삭제
                      </button>
                    </div>
                  </div>
                  {(ev.starts_on || ev.ends_on) && (
                    <p className="mt-1 text-[12px] font-semibold text-primary">
                      {ev.starts_on ?? "?"} ~ {ev.ends_on ?? "?"}
                    </p>
                  )}
                  <p className="mt-1 line-clamp-2 text-[12px] text-sub">{ev.content}</p>
                  <p className="mt-1 text-[11px] text-faint">{fmtDateTime(ev.created_at)}</p>
                </div>
              </div>
            ))}
            {list.length === 0 && (
              <p className="py-10 text-center text-sm text-faint">등록된 이벤트가 없습니다.</p>
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
