"use client";
import { useEffect, useState } from "react";
import AdminNav from "../AdminNav";
import { fmtDateTime } from "@/lib/format";

type Notice = {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_visible: boolean;
  created_at: string;
};

const EMPTY = { title: "", content: "", is_pinned: false, is_visible: true };

export default function AdminNoticesPage() {
  const [list, setList] = useState<Notice[] | null>(null);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const load = () =>
    fetch("/api/admin/notices")
      .then((r) => r.json())
      .then((d) => setList(d.notices ?? []));

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
  const openEdit = (n: Notice) => {
    setForm({
      title: n.title,
      content: n.content,
      is_pinned: n.is_pinned,
      is_visible: n.is_visible,
    });
    setEditing(n.id);
  };

  const save = async () => {
    if (!form.title.trim()) return alert("제목을 입력해 주세요.");
    setSaving(true);
    try {
      const url = editing === "new" ? "/api/admin/notices" : `/api/admin/notices/${editing}`;
      const method = editing === "new" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error || "저장 실패");
      setToast(editing === "new" ? "공지를 등록했습니다" : "수정했습니다");
      setEditing(null);
      load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const quickToggle = async (n: Notice, field: "is_pinned" | "is_visible") => {
    await fetch(`/api/admin/notices/${n.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: !n[field] }),
    });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("이 공지를 삭제할까요? 되돌릴 수 없습니다.")) return;
    await fetch(`/api/admin/notices/${id}`, { method: "DELETE" });
    setToast("삭제했습니다");
    load();
  };

  return (
    <div>
      <AdminNav />
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-[17px] font-extrabold">
            공지사항{" "}
            {list && <span className="text-[13px] font-semibold text-faint">({list.length})</span>}
          </h1>
          <button
            onClick={openNew}
            className="rounded-lg bg-primary px-3 py-1.5 text-[13px] font-bold text-white"
          >
            + 공지 작성
          </button>
        </div>

        {editing && (
          <div className="mb-4 rounded-2xl border border-primary/30 bg-primary-soft/40 p-4">
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="제목"
              className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[14px] font-semibold outline-none focus:border-primary"
            />
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="내용"
              rows={5}
              className="mt-2.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[14px] outline-none focus:border-primary"
            />
            <div className="mt-2.5 flex gap-4">
              <label className="flex items-center gap-1.5 text-[13px] font-semibold">
                <input
                  type="checkbox"
                  checked={form.is_pinned}
                  onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })}
                  className="accent-primary"
                />
                상단 고정
              </label>
              <label className="flex items-center gap-1.5 text-[13px] font-semibold">
                <input
                  type="checkbox"
                  checked={form.is_visible}
                  onChange={(e) => setForm({ ...form, is_visible: e.target.checked })}
                  className="accent-primary"
                />
                공개
              </label>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setEditing(null)}
                className="h-10 flex-1 rounded-lg border border-line text-[13px] font-semibold text-sub"
              >
                취소
              </button>
              <button
                onClick={save}
                disabled={saving}
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
              <div key={i} className="h-16 animate-pulse rounded-xl bg-canvas" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((n) => (
              <div key={n.id} className="rounded-xl border border-line p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[14px] font-bold">
                    {n.is_pinned && <span className="text-primary">📌 </span>}
                    {n.title}
                  </p>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => quickToggle(n, "is_visible")}
                      className={`rounded-lg px-2 py-1 text-[11px] font-bold ${
                        n.is_visible ? "bg-primary-soft text-primary" : "bg-canvas text-faint"
                      }`}
                    >
                      {n.is_visible ? "공개" : "비공개"}
                    </button>
                    <button onClick={() => openEdit(n)} className="text-[12px] text-sub">
                      수정
                    </button>
                    <button onClick={() => remove(n.id)} className="text-[12px] text-danger">
                      삭제
                    </button>
                  </div>
                </div>
                <p className="mt-1 line-clamp-2 text-[12px] text-sub">{n.content}</p>
                <p className="mt-1 text-[11px] text-faint">{fmtDateTime(n.created_at)}</p>
              </div>
            ))}
            {list.length === 0 && (
              <p className="py-10 text-center text-sm text-faint">등록된 공지가 없습니다.</p>
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
