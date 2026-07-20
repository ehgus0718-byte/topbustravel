"use client";
import { useEffect, useMemo, useState } from "react";
import AdminNav from "../AdminNav";
import { won, fmtDate, fmtDateTime, formatPhone, STATUS_LABEL } from "@/lib/format";

const FILTERS = ["all", "pending", "paid", "confirmed", "canceled", "refunded"];

// 상태별 배지 색상 (표시 전용 — 데이터/로직에는 영향 없음)
const STATUS_BADGE: Record<string, string> = {
  pending: "bg-accent/10 text-accent",
  paid: "bg-primary-soft text-primary",
  confirmed: "bg-primary-soft text-primary",
  canceled: "bg-canvas text-faint",
  refunded: "bg-canvas text-faint",
};

const FIELD_LABEL: Record<string, string> = {
  customer_name: "성함",
  customer_phone: "휴대폰 번호",
};

type QuickFilter = "none" | "today" | "tomorrow" | "unpaid";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// CSV 필드 이스케이프 (쉼표/줄바꿈/따옴표 포함 값 보호)
function csvCell(v: any): string {
  const s = v === null || v === undefined ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

export default function AdminReservationsPage() {
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [list, setList] = useState<any[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  // ── 추가된 부분: 빠른 필터 + 기간(출발일) 검색 — 서버 호출 없이 이미 불러온 목록만 필터링 ──
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("none");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // ── 예약 정보 수정(성함/연락처) + 변경 이력 ──
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [histories, setHistories] = useState<Record<string, any[]>>({});

  const load = () => {
    const params = new URLSearchParams({ status });
    if (q.trim()) params.set("q", q.trim());
    fetch(`/api/admin/reservations?${params}`)
      .then((r) => r.json())
      .then((d) => setList(d.reservations ?? []));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const patch = async (id: string, body: any) => {
    await fetch(`/api/admin/reservations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    load();
  };

  const loadHistory = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/reservations/${id}/history`);
      const d = await res.json();
      setHistories((prev) => ({ ...prev, [id]: d.logs ?? [] }));
    } catch {
      setHistories((prev) => ({ ...prev, [id]: [] }));
    }
  };

  const startEdit = (r: any) => {
    setEditId(r.id);
    setEditName(r.customer_name);
    setEditPhone(r.customer_phone);
  };

  const saveEdit = async (r: any) => {
    const name = editName.trim();
    if (!name) {
      alert("성함을 입력해 주세요.");
      return;
    }
    if (editPhone.replace(/\D/g, "").length < 10) {
      alert("올바른 휴대폰 번호를 입력해 주세요.");
      return;
    }
    if (name === r.customer_name && editPhone === r.customer_phone) {
      setEditId(null);
      return;
    }
    if (!confirm("예약 정보를 수정하시겠습니까?")) return;

    setEditBusy(true);
    try {
      const res = await fetch(`/api/admin/reservations/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_name: name, customer_phone: editPhone }),
      });
      const d = await res.json();
      if (!res.ok) {
        alert(d.error ?? "수정에 실패했습니다.");
        return;
      }
      alert("예약 정보 수정 완료");
      setEditId(null);
      load();
      loadHistory(r.id);
    } catch {
      alert("수정에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setEditBusy(false);
    }
  };

  // 서버에서 불러온 list는 그대로 두고, 화면 표시용으로만 추가 필터링
  const filtered = useMemo(() => {
    let arr = list;
    if (quickFilter === "today") {
      arr = arr.filter((r) => r.departure?.departure_date === todayStr());
    } else if (quickFilter === "tomorrow") {
      arr = arr.filter((r) => r.departure?.departure_date === tomorrowStr());
    } else if (quickFilter === "unpaid") {
      arr = arr.filter((r) => r.status === "pending");
    }
    if (fromDate) {
      arr = arr.filter((r) => (r.departure?.departure_date ?? "") >= fromDate);
    }
    if (toDate) {
      arr = arr.filter((r) => (r.departure?.departure_date ?? "") <= toDate);
    }
    return arr;
  }, [list, quickFilter, fromDate, toDate]);

  // 엑셀(CSV) 다운로드 — 현재 화면에 보이는(필터링된) 목록을 그대로 내보냄. 읽기 전용, 데이터 변경 없음.
  const downloadCsv = () => {
    const header = [
      "예약번호", "예약자", "연락처", "상품명", "출발일",
      "성인", "아동", "유아", "결제수단", "결제금액", "상태", "접수일시", "메모",
    ];
    const rows = filtered.map((r) => [
      r.id.slice(0, 8).toUpperCase(),
      r.customer_name,
      r.customer_phone,
      r.product?.title ?? "",
      r.departure ? r.departure.departure_date : "",
      r.adult_count,
      r.child_count,
      r.infant_count,
      r.payment_method === "bank" ? "무통장" : "카드",
      r.total_amount,
      STATUS_LABEL[r.status] ?? r.status,
      r.created_at,
      r.admin_note ?? "",
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    // UTF-8 BOM: 엑셀에서 한글이 깨지지 않도록 필요
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
    a.href = url;
    a.download = `예약목록_${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* 인쇄 시에는 관리자 메뉴/필터/버튼을 숨기고 표만 출력 */}
      <div className="print:hidden">
        <AdminNav />
      </div>
      <div className="p-4 print:hidden">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h1 className="text-[17px] font-extrabold">
            예약 관리{" "}
            <span className="text-[13px] font-semibold text-faint">
              ({filtered.length}건 표시 중)
            </span>
          </h1>
          <div className="flex gap-1.5">
            <button
              onClick={downloadCsv}
              className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-bold text-sub"
            >
              📊 엑셀
            </button>
            <button
              onClick={() => window.print()}
              className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-bold text-sub"
            >
              🖨️ 인쇄
            </button>
          </div>
        </div>

        <div className="mb-3 flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="이름 · 전화번호 · 예약번호 · 상품명 검색"
            className="flex-1 rounded-xl border border-line px-3.5 py-2.5 text-[14px] outline-none focus:border-primary"
          />
          <button onClick={load} className="rounded-xl bg-ink px-4 text-[13px] font-bold text-white">
            검색
          </button>
        </div>

        <div className="mb-3 flex gap-1.5 overflow-x-auto no-scrollbar">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatus(f)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold ${
                status === f ? "bg-ink text-white" : "border border-line bg-white text-sub"
              }`}
            >
              {f === "all" ? "전체" : STATUS_LABEL[f]}
            </button>
          ))}
        </div>

        {/* 빠른 필터 — 기존 상태 필터와 별개로, 이미 불러온 목록 위에서만 추가로 좁혀서 보여줌 */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {([
            ["none", "빠른필터 해제"],
            ["today", "🚌 오늘 출발"],
            ["tomorrow", "📅 내일 출발"],
            ["unpaid", "⚠️ 미결제"],
          ] as [QuickFilter, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setQuickFilter(quickFilter === key ? "none" : key)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold ${
                quickFilter === key
                  ? "bg-primary text-white"
                  : "border border-line bg-white text-sub"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 기간(출발일) 검색 — 현재 불러온 목록 범위 내에서만 동작 */}
        <div className="mb-4 flex items-center gap-2 text-[13px]">
          <span className="shrink-0 font-semibold text-sub">출발일</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-lg border border-line px-2.5 py-2 text-[13px]"
          />
          <span className="text-faint">~</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-lg border border-line px-2.5 py-2 text-[13px]"
          />
          {(fromDate || toDate) && (
            <button
              onClick={() => {
                setFromDate("");
                setToDate("");
              }}
              className="text-[12px] font-semibold text-faint underline-offset-2 hover:underline"
            >
              초기화
            </button>
          )}
        </div>

        <div className="space-y-2">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-xl border border-line">
              <button
                onClick={() => {
                  const next = openId === r.id ? null : r.id;
                  setOpenId(next);
                  setEditId(null);
                  if (next && histories[r.id] === undefined) loadHistory(r.id);
                }}
                className="flex w-full items-center justify-between gap-2 p-3 text-left"
              >
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-bold">
                    {r.customer_name}{" "}
                    <span className="font-medium text-faint">{r.customer_phone}</span>
                  </p>
                  <p className="truncate text-[12px] text-sub">
                    {r.product?.title ?? "-"} ·{" "}
                    {r.departure ? fmtDate(r.departure.departure_date) : "-"} 출발
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[13px] font-bold">{won(r.total_amount)}</p>
                  <span
                    className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      STATUS_BADGE[r.status] ?? "bg-canvas text-faint"
                    }`}
                  >
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </div>
              </button>

              {openId === r.id && (
                <div className="border-t border-line p-3 text-[13px]">
                  <p className="text-sub">
                    예약번호 {r.id.slice(0, 8).toUpperCase()} · {fmtDateTime(r.created_at)} 접수
                  </p>
                  <p className="mt-1 text-sub">
                    인원: 성인 {r.adult_count} / 아동 {r.child_count} / 유아 {r.infant_count}
                    {r.boarding_point && ` · 탑승: ${r.boarding_point.name} (${r.boarding_point.boarding_time})`}
                  </p>
                  <p className="mt-1 text-sub">
                    결제: {r.payment_method === "bank" ? "무통장" : "카드"}
                    {r.payment_tid && ` · TID ${r.payment_tid}`}
                  </p>
                  {r.request_memo && (
                    <p className="mt-1.5 rounded-lg bg-canvas p-2 text-ink">
                      💬 {r.request_memo}
                    </p>
                  )}

                  {/* 예약 정보 수정 (성함/연락처) — 상태/금액은 이 폼에서 변경 불가 */}
                  {editId === r.id ? (
                    <div className="mt-3 rounded-lg border border-line p-3">
                      <p className="mb-2 text-[12px] font-bold text-sub">예약 정보 수정</p>
                      <div className="space-y-2">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="성함"
                          className="w-full rounded-lg border border-line px-3 py-2.5 text-[13px] outline-none focus:border-primary"
                        />
                        <input
                          value={editPhone}
                          onChange={(e) => setEditPhone(formatPhone(e.target.value))}
                          placeholder="휴대폰 번호"
                          inputMode="numeric"
                          className="w-full rounded-lg border border-line px-3 py-2.5 text-[13px] outline-none focus:border-primary"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEdit(r)}
                            disabled={editBusy}
                            className="flex-1 rounded-lg bg-primary py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
                          >
                            {editBusy ? "저장 중..." : "저장"}
                          </button>
                          <button
                            onClick={() => setEditId(null)}
                            disabled={editBusy}
                            className="flex-1 rounded-lg border border-line py-2.5 text-[13px] font-semibold text-sub"
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex items-center gap-2">
                      <select
                        value={r.status}
                        onChange={(e) => patch(r.id, { status: e.target.value })}
                        className="rounded-lg border border-line px-2 py-2 text-[13px]"
                      >
                        {Object.entries(STATUS_LABEL).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => startEdit(r)}
                        className="rounded-lg border border-line px-3 py-2 text-[13px] font-semibold text-sub"
                      >
                        ✏️ 정보 수정
                      </button>
                      <button
                        onClick={() => {
                          const note = prompt("관리자 메모", r.admin_note ?? "");
                          if (note === null) return;
                          patch(r.id, { admin_note: note });
                        }}
                        className="rounded-lg border border-line px-3 py-2 text-[13px] font-semibold text-sub"
                      >
                        메모 {r.admin_note ? "✏️" : "+"}
                      </button>
                      <a
                        href={`tel:${r.customer_phone.replace(/-/g, "")}`}
                        className="rounded-lg border border-line px-3 py-2 text-[13px] font-semibold text-sub"
                      >
                        📞 전화
                      </a>
                    </div>
                  )}
                  {r.admin_note && (
                    <p className="mt-2 text-[12px] text-faint">메모: {r.admin_note}</p>
                  )}

                  {/* 변경 이력 — 이전 정보 → 변경된 정보 */}
                  {(histories[r.id]?.length ?? 0) > 0 && (
                    <div className="mt-3 rounded-lg bg-canvas p-2.5">
                      <p className="mb-1.5 text-[12px] font-bold text-sub">변경 이력</p>
                      <ul className="space-y-1">
                        {histories[r.id].map((h) => (
                          <li key={h.id} className="text-[12px] text-sub">
                            <span className="text-faint">{fmtDateTime(h.created_at)}</span>{" "}
                            · {FIELD_LABEL[h.field] ?? h.field}:{" "}
                            <span className="line-through">{h.old_value}</span>
                            {" → "}
                            <span className="font-semibold text-ink">{h.new_value}</span>{" "}
                            <span className="text-faint">
                              ({h.changed_by === "admin" ? "관리자" : "고객"})
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="py-10 text-center text-sm text-faint">
              {list.length === 0 ? "예약이 없습니다." : "조건에 맞는 예약이 없습니다."}
            </p>
          )}
        </div>
      </div>

      {/* 인쇄 전용 표 — 화면에는 보이지 않고 인쇄할 때만 나타남 */}
      <table className="hidden w-full border-collapse text-[11px] print:table">
        <caption className="mb-2 text-left text-[14px] font-bold">
          예약 목록 ({new Date().toLocaleDateString("ko-KR")} 출력)
        </caption>
        <thead>
          <tr className="border-b-2 border-ink text-left">
            <th className="p-1.5">예약번호</th>
            <th className="p-1.5">예약자</th>
            <th className="p-1.5">연락처</th>
            <th className="p-1.5">상품명</th>
            <th className="p-1.5">출발일</th>
            <th className="p-1.5">인원</th>
            <th className="p-1.5">결제금액</th>
            <th className="p-1.5">상태</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => (
            <tr key={r.id} className="border-b border-line">
              <td className="p-1.5">{r.id.slice(0, 8).toUpperCase()}</td>
              <td className="p-1.5">{r.customer_name}</td>
              <td className="p-1.5">{r.customer_phone}</td>
              <td className="p-1.5">{r.product?.title ?? "-"}</td>
              <td className="p-1.5">{r.departure ? fmtDate(r.departure.departure_date) : "-"}</td>
              <td className="p-1.5">
                성{r.adult_count}/아{r.child_count}/유{r.infant_count}
              </td>
              <td className="p-1.5">{won(r.total_amount)}</td>
              <td className="p-1.5">{STATUS_LABEL[r.status] ?? r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
