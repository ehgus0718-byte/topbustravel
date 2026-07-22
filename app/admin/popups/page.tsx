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

type FloatBtn = {
  id: string;
  label: string;
  link_url: string;
  icon_url: string | null;
  new_tab: boolean;
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

const FB_EMPTY = {
  label: "",
  link_url: "",
  icon_url: "",
  new_tab: true,
  sort_order: 0,
  is_visible: true,
};

type HeroSlideItem = {
  id: string;
  badge: string | null;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  starts_on: string | null;
  ends_on: string | null;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
};

const HS_EMPTY = {
  badge: "",
  title: "",
  subtitle: "",
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

  // ── 플로팅 버튼 상태 ──
  const [fbList, setFbList] = useState<FloatBtn[] | null>(null);
  const [fbEditing, setFbEditing] = useState<string | "new" | null>(null);
  const [fbForm, setFbForm] = useState<typeof FB_EMPTY>(FB_EMPTY);
  const [fbSaving, setFbSaving] = useState(false);
  const [fbUploading, setFbUploading] = useState(false);

  // ── 히어로 슬라이드 상태 ──
  const [hsList, setHsList] = useState<HeroSlideItem[] | null>(null);
  const [hsEditing, setHsEditing] = useState<string | "new" | null>(null);
  const [hsForm, setHsForm] = useState<typeof HS_EMPTY>(HS_EMPTY);
  const [hsSaving, setHsSaving] = useState(false);
  const [hsUploading, setHsUploading] = useState(false);

  const load = () =>
    fetch("/api/admin/popups")
      .then((r) => r.json())
      .then((d) => setList(d.popups ?? []));

  const loadFb = () =>
    fetch("/api/admin/floating-buttons")
      .then((r) => r.json())
      .then((d) => setFbList(d.buttons ?? []));

  const loadHs = () =>
    fetch("/api/admin/hero-slides")
      .then((r) => r.json())
      .then((d) => setHsList(d.slides ?? []));

  useEffect(() => {
    load();
    loadFb();
    loadHs();
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const uploadTo = async (file: File, onDone: (url: string) => void, setBusy: (b: boolean) => void) => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "업로드 실패");
      onDone(data.url);
      setToast("이미지를 업로드했습니다");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  // ── 팝업 핸들러 ──
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

  // ── 플로팅 버튼 핸들러 ──
  const fbOpenNew = () => {
    setFbForm(FB_EMPTY);
    setFbEditing("new");
  };
  const fbOpenEdit = (b: FloatBtn) => {
    setFbForm({
      label: b.label,
      link_url: b.link_url,
      icon_url: b.icon_url ?? "",
      new_tab: b.new_tab,
      sort_order: b.sort_order ?? 0,
      is_visible: b.is_visible,
    });
    setFbEditing(b.id);
  };

  const fbSave = async () => {
    if (!fbForm.label.trim()) return alert("버튼 이름을 입력해 주세요.");
    if (!fbForm.link_url.trim()) return alert("링크 주소를 입력해 주세요.");
    setFbSaving(true);
    try {
      const url =
        fbEditing === "new"
          ? "/api/admin/floating-buttons"
          : `/api/admin/floating-buttons/${fbEditing}`;
      const method = fbEditing === "new" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fbForm),
      });
      if (!res.ok) throw new Error((await res.json()).error || "저장 실패");
      setToast(fbEditing === "new" ? "버튼을 등록했습니다" : "수정했습니다");
      setFbEditing(null);
      loadFb();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setFbSaving(false);
    }
  };

  const fbRemove = async (id: string) => {
    if (!confirm("이 버튼을 삭제할까요? 되돌릴 수 없습니다.")) return;
    await fetch(`/api/admin/floating-buttons/${id}`, { method: "DELETE" });
    setToast("삭제했습니다");
    loadFb();
  };

  // ── 히어로 슬라이드 핸들러 ──
  const hsOpenNew = () => {
    setHsForm(HS_EMPTY);
    setHsEditing("new");
  };
  const hsOpenEdit = (s: HeroSlideItem) => {
    setHsForm({
      badge: s.badge ?? "",
      title: s.title,
      subtitle: s.subtitle ?? "",
      image_url: s.image_url,
      link_url: s.link_url ?? "",
      starts_on: s.starts_on ?? "",
      ends_on: s.ends_on ?? "",
      sort_order: s.sort_order ?? 0,
      is_visible: s.is_visible,
    });
    setHsEditing(s.id);
  };

  const hsSave = async () => {
    if (!hsForm.title.trim()) return alert("제목을 입력해 주세요.");
    if (!hsForm.image_url.trim()) return alert("배경 사진을 업로드해 주세요.");
    if (hsForm.starts_on && hsForm.ends_on && hsForm.starts_on > hsForm.ends_on) {
      return alert("종료일이 시작일보다 빠릅니다.");
    }
    setHsSaving(true);
    try {
      const url =
        hsEditing === "new" ? "/api/admin/hero-slides" : `/api/admin/hero-slides/${hsEditing}`;
      const method = hsEditing === "new" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hsForm),
      });
      if (!res.ok) throw new Error((await res.json()).error || "저장 실패");
      setToast(hsEditing === "new" ? "슬라이드를 등록했습니다" : "수정했습니다");
      setHsEditing(null);
      loadHs();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setHsSaving(false);
    }
  };

  const hsRemove = async (id: string) => {
    if (!confirm("이 슬라이드를 삭제할까요? 되돌릴 수 없습니다.")) return;
    await fetch(`/api/admin/hero-slides/${id}`, { method: "DELETE" });
    setToast("삭제했습니다");
    loadHs();
  };

  return (
    <div>
      <AdminNav />
      <div className="p-4">
        {/* ══════════ 히어로 슬라이드 관리 ══════════ */}
        <div className="mb-1 flex items-center justify-between">
          <h1 className="text-[17px] font-extrabold">
            히어로 슬라이드{" "}
            {hsList && (
              <span className="text-[13px] font-semibold text-faint">({hsList.length})</span>
            )}
          </h1>
          <button
            onClick={hsOpenNew}
            className="rounded-lg bg-primary px-3 py-1.5 text-[13px] font-bold text-white"
          >
            + 슬라이드 만들기
          </button>
        </div>
        <p className="mb-3 text-[12px] text-faint">
          홈 최상단 큰 사진 영역입니다. 공개 상태 중 표시순서 상위 <b>5개까지</b> 6초 간격으로
          자동 전환되며, 사진 전체가 클릭 영역입니다. 슬라이드가 하나도 없으면 기존 파란
          배경 화면이 그대로 표시됩니다. 사진은 가로로 긴 사진(권장 1920×800 이상)을
          사용하세요.
        </p>

        {hsEditing && (
          <div className="mb-4 rounded-2xl border border-primary/30 bg-primary-soft/40 p-4">
            {/* 배경 사진 */}
            <div>
              {hsForm.image_url ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={hsForm.image_url}
                    alt="슬라이드 사진 미리보기"
                    className="h-40 w-full rounded-lg border border-line object-cover"
                  />
                  <button
                    onClick={() => setHsForm({ ...hsForm, image_url: "" })}
                    className="absolute right-2 top-2 rounded-lg bg-ink/70 px-2 py-1 text-[12px] font-bold text-white"
                  >
                    제거
                  </button>
                </div>
              ) : (
                <label className="flex h-28 cursor-pointer items-center justify-center rounded-lg border border-dashed border-line bg-white text-[13px] font-semibold text-sub">
                  {hsUploading ? "업로드 중..." : "📷 배경 사진 업로드 (필수 · 가로로 긴 사진)"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f)
                        uploadTo(f, (url) => setHsForm((v) => ({ ...v, image_url: url })), setHsUploading);
                    }}
                  />
                </label>
              )}
            </div>

            <input
              value={hsForm.badge}
              onChange={(e) => setHsForm({ ...hsForm, badge: e.target.value })}
              placeholder="배지 문구 (선택, 예: 7월 출발확정 · 짧을수록 좋아요)"
              className="mt-2.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[13px] outline-none focus:border-primary"
            />
            <input
              value={hsForm.title}
              onChange={(e) => setHsForm({ ...hsForm, title: e.target.value })}
              placeholder="제목 (필수, 예: 여름빛 서해안 당일여행)"
              className="mt-2.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[14px] font-semibold outline-none focus:border-primary"
            />
            <input
              value={hsForm.subtitle}
              onChange={(e) => setHsForm({ ...hsForm, subtitle: e.target.value })}
              placeholder="부제 (선택, 예: 대전·세종 출발, 집 근처 탑승)"
              className="mt-2.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[13px] outline-none focus:border-primary"
            />
            <input
              value={hsForm.link_url}
              onChange={(e) => setHsForm({ ...hsForm, link_url: e.target.value })}
              placeholder="클릭 시 이동할 링크 (선택, 예: /products/namhae-yeosu-2days 또는 https://...)"
              className="mt-2.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[13px] outline-none focus:border-primary"
            />

            {/* 노출 기간 + 정렬 */}
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[13px]">
              <input
                type="date"
                value={hsForm.starts_on}
                onChange={(e) => setHsForm({ ...hsForm, starts_on: e.target.value })}
                className="rounded-lg border border-line bg-white px-2.5 py-2"
              />
              <span className="text-faint">~</span>
              <input
                type="date"
                value={hsForm.ends_on}
                onChange={(e) => setHsForm({ ...hsForm, ends_on: e.target.value })}
                className="rounded-lg border border-line bg-white px-2.5 py-2"
              />
              <label className="ml-auto flex items-center gap-1.5">
                <span className="text-faint">표시순서</span>
                <input
                  type="number"
                  value={hsForm.sort_order}
                  onChange={(e) => setHsForm({ ...hsForm, sort_order: Number(e.target.value) })}
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
                checked={hsForm.is_visible}
                onChange={(e) => setHsForm({ ...hsForm, is_visible: e.target.checked })}
                className="accent-primary"
              />
              공개
            </label>

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setHsEditing(null)}
                className="h-10 flex-1 rounded-lg border border-line text-[13px] font-semibold text-sub"
              >
                취소
              </button>
              <button
                onClick={hsSave}
                disabled={hsSaving || hsUploading}
                className="h-10 flex-1 rounded-lg bg-primary text-[13px] font-bold text-white disabled:opacity-50"
              >
                {hsSaving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        )}

        {hsList === null ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-canvas" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {hsList.map((s, i) => (
              <div key={s.id} className="overflow-hidden rounded-xl border border-line">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.image_url} alt={s.title} className="h-28 w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/55 to-black/10" />
                  <div className="absolute inset-x-3 bottom-2.5">
                    {s.badge && (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white">
                        {s.badge}
                      </span>
                    )}
                    <p className="mt-0.5 truncate text-[14px] font-extrabold text-white">
                      {s.title}
                    </p>
                  </div>
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] font-bold">
                      <span className="mr-1.5 text-[12px] font-semibold text-faint">
                        #{s.sort_order}
                      </span>
                      {s.subtitle || s.title}
                      {i >= 5 && s.is_visible && (
                        <span className="ml-1.5 text-[11px] font-semibold text-danger">
                          (6번째부터는 노출 안 됨)
                        </span>
                      )}
                    </p>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span
                        className={`rounded-lg px-2 py-1 text-[11px] font-bold ${
                          s.is_visible ? "bg-primary-soft text-primary" : "bg-canvas text-faint"
                        }`}
                      >
                        {s.is_visible ? "공개" : "비공개"}
                      </span>
                      <button onClick={() => hsOpenEdit(s)} className="text-[12px] text-sub">
                        수정
                      </button>
                      <button onClick={() => hsRemove(s.id)} className="text-[12px] text-danger">
                        삭제
                      </button>
                    </div>
                  </div>
                  {(s.starts_on || s.ends_on) && (
                    <p className="mt-1 text-[12px] font-semibold text-primary">
                      {s.starts_on ?? "제한없음"} ~ {s.ends_on ?? "제한없음"}
                    </p>
                  )}
                  {s.link_url && (
                    <p className="mt-1 truncate text-[12px] text-sub">🔗 {s.link_url}</p>
                  )}
                  <p className="mt-1 text-[11px] text-faint">{fmtDateTime(s.created_at)}</p>
                </div>
              </div>
            ))}
            {hsList.length === 0 && (
              <p className="py-8 text-center text-sm text-faint">
                등록된 슬라이드가 없습니다. 슬라이드가 없으면 기존 파란 히어로가 표시됩니다.
              </p>
            )}
          </div>
        )}

        {/* ══════════ 홈 팝업 관리 ══════════ */}
        <div className="mb-1 mt-10 flex items-center justify-between border-t border-line pt-8">
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
                      if (f) uploadTo(f, (url) => setForm((v) => ({ ...v, image_url: url })), setUploading);
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

        {/* ══════════ 플로팅 버튼 관리 ══════════ */}
        <div className="mb-1 mt-10 flex items-center justify-between border-t border-line pt-8">
          <h2 className="text-[17px] font-extrabold">
            플로팅 버튼{" "}
            {fbList && (
              <span className="text-[13px] font-semibold text-faint">({fbList.length})</span>
            )}
          </h2>
          <button
            onClick={fbOpenNew}
            className="rounded-lg bg-primary px-3 py-1.5 text-[13px] font-bold text-white"
          >
            + 버튼 만들기
          </button>
        </div>
        <p className="mb-3 text-[12px] text-faint">
          사이트 오른쪽 아래에 떠 있는 원형 링크 버튼입니다. 공개 상태 중 표시순서 상위{" "}
          <b>3개까지만</b> 노출됩니다. (상품 상세·예약 페이지에서는 하단 예약 버튼과 겹치지
          않도록 표시되지 않습니다)
        </p>

        {fbEditing && (
          <div className="mb-4 rounded-2xl border border-primary/30 bg-primary-soft/40 p-4">
            <input
              value={fbForm.label}
              onChange={(e) => setFbForm({ ...fbForm, label: e.target.value })}
              placeholder="버튼 이름 (예: 카카오톡 문의, 단체버스 견적)"
              className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[14px] font-semibold outline-none focus:border-primary"
            />
            <input
              value={fbForm.link_url}
              onChange={(e) => setFbForm({ ...fbForm, link_url: e.target.value })}
              placeholder="링크 주소 (예: /contact 또는 https://pf.kakao.com/...)"
              className="mt-2.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[13px] outline-none focus:border-primary"
            />

            {/* 아이콘 */}
            <div className="mt-2.5 flex items-center gap-3">
              <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-white shadow-sm">
                {fbForm.icon_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={fbForm.icon_url} alt="아이콘 미리보기" className="h-8 w-8 object-contain" />
                ) : (
                  <span className="text-[11px] text-faint">기본</span>
                )}
              </div>
              <label className="flex h-10 flex-1 cursor-pointer items-center justify-center rounded-lg border border-dashed border-line bg-white text-[13px] font-semibold text-sub">
                {fbUploading ? "업로드 중..." : "🖼️ 아이콘 이미지 업로드 (선택)"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadTo(f, (url) => setFbForm((v) => ({ ...v, icon_url: url })), setFbUploading);
                  }}
                />
              </label>
              {fbForm.icon_url && (
                <button
                  onClick={() => setFbForm({ ...fbForm, icon_url: "" })}
                  className="text-[12px] font-semibold text-faint underline-offset-2 hover:underline"
                >
                  제거
                </button>
              )}
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-4 text-[13px]">
              <label className="flex items-center gap-1.5 font-semibold">
                <input
                  type="checkbox"
                  checked={fbForm.new_tab}
                  onChange={(e) => setFbForm({ ...fbForm, new_tab: e.target.checked })}
                  className="accent-primary"
                />
                새 창에서 열기
              </label>
              <label className="flex items-center gap-1.5 font-semibold">
                <input
                  type="checkbox"
                  checked={fbForm.is_visible}
                  onChange={(e) => setFbForm({ ...fbForm, is_visible: e.target.checked })}
                  className="accent-primary"
                />
                공개
              </label>
              <label className="ml-auto flex items-center gap-1.5">
                <span className="text-faint">표시순서</span>
                <input
                  type="number"
                  value={fbForm.sort_order}
                  onChange={(e) => setFbForm({ ...fbForm, sort_order: Number(e.target.value) })}
                  className="w-16 rounded-lg border border-line bg-white px-2.5 py-2 text-center"
                />
              </label>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setFbEditing(null)}
                className="h-10 flex-1 rounded-lg border border-line text-[13px] font-semibold text-sub"
              >
                취소
              </button>
              <button
                onClick={fbSave}
                disabled={fbSaving || fbUploading}
                className="h-10 flex-1 rounded-lg bg-primary text-[13px] font-bold text-white disabled:opacity-50"
              >
                {fbSaving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        )}

        {fbList === null ? (
          <div className="h-16 animate-pulse rounded-xl bg-canvas" />
        ) : (
          <div className="space-y-2">
            {fbList.map((b, i) => (
              <div
                key={b.id}
                className="flex items-center gap-3 rounded-xl border border-line p-3"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-white">
                  {b.icon_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.icon_url} alt="" className="h-7 w-7 object-contain" />
                  ) : (
                    <span className="text-[10px] text-faint">기본</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold">
                    <span className="mr-1.5 text-[12px] font-semibold text-faint">
                      #{b.sort_order}
                    </span>
                    {b.label}
                    {i >= 3 && b.is_visible && (
                      <span className="ml-1.5 text-[11px] font-semibold text-danger">
                        (4번째부터는 노출 안 됨)
                      </span>
                    )}
                  </p>
                  <p className="truncate text-[12px] text-sub">
                    🔗 {b.link_url} {b.new_tab && "· 새 창"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span
                    className={`rounded-lg px-2 py-1 text-[11px] font-bold ${
                      b.is_visible ? "bg-primary-soft text-primary" : "bg-canvas text-faint"
                    }`}
                  >
                    {b.is_visible ? "공개" : "비공개"}
                  </span>
                  <button onClick={() => fbOpenEdit(b)} className="text-[12px] text-sub">
                    수정
                  </button>
                  <button onClick={() => fbRemove(b.id)} className="text-[12px] text-danger">
                    삭제
                  </button>
                </div>
              </div>
            ))}
            {fbList.length === 0 && (
              <p className="py-8 text-center text-sm text-faint">
                등록된 플로팅 버튼이 없습니다.
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
