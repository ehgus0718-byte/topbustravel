"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const RECENT_KEY = "tb_recent_searches";
const RECENT_MAX = 6;

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
function writeRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
  } catch {}
}

type Suggestion = { id: string; title: string; slug: string; thumbnail_url: string | null };

/**
 * 홈 상단 검색창 — 둥근 알약형, 자동완성 + 최근 검색어
 * 예약 버튼(primary 색상)보다 시선을 끌지 않도록 테두리형으로 절제된 톤 유지
 */
export default function SearchBar() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setRecent(readRecent());
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(value.trim())}`);
        const data = await res.json();
        setSuggestions(data.items ?? []);
      } catch {
        setSuggestions([]);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  const commitSearch = (keyword: string) => {
    const kw = keyword.trim();
    if (!kw) return;
    const next = [kw, ...recent.filter((r) => r !== kw)].slice(0, RECENT_MAX);
    setRecent(next);
    writeRecent(next);
    setFocused(false);
    router.push(`/products?q=${encodeURIComponent(kw)}`);
  };

  const removeRecent = (kw: string) => {
    const next = recent.filter((r) => r !== kw);
    setRecent(next);
    writeRecent(next);
  };

  const showPanel = focused && (suggestions.length > 0 || (!value.trim() && recent.length > 0));

  return (
    <div ref={wrapRef} className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          commitSearch(value);
        }}
        role="search"
      >
        <div
          className={`flex h-12 items-center gap-2 rounded-full border bg-white pl-4 pr-2 shadow-sm transition md:h-[52px] ${
            focused ? "border-primary" : "border-line"
          }`}
        >
          <SearchIcon />
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder="어디로 떠나고 싶으세요?"
            className="h-full w-full min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-faint"
            autoComplete="off"
          />
          {value && (
            <button
              type="button"
              onClick={() => setValue("")}
              aria-label="검색어 지우기"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-faint hover:bg-canvas"
            >
              <CloseIcon />
            </button>
          )}
          <button
            type="submit"
            className="h-9 shrink-0 rounded-full bg-primary px-4 text-[13px] font-bold text-white transition active:scale-[0.97] md:h-10 md:px-5 md:text-[14px]"
          >
            검색
          </button>
        </div>
      </form>

      {showPanel && (
        <div className="absolute inset-x-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-2xl border border-line bg-white shadow-lg">
          {value.trim() ? (
            suggestions.length > 0 ? (
              <ul>
                {suggestions.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setFocused(false);
                        setValue(s.title);
                        commitSearch(s.title);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-canvas"
                    >
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-canvas">
                        {s.thumbnail_url && (
                          <Image src={s.thumbnail_url} alt="" fill sizes="40px" className="object-cover" />
                        )}
                      </div>
                      <span className="line-clamp-1 text-[14px] font-medium text-ink">{s.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-6 text-center text-[13px] text-faint">검색 결과가 없어요</p>
            )
          ) : (
            recent.length > 0 && (
              <div className="p-3">
                <p className="px-1 pb-1.5 text-[12px] font-semibold text-faint">최근 검색어</p>
                <ul className="flex flex-wrap gap-1.5">
                  {recent.map((r) => (
                    <li key={r} className="flex items-center gap-1 rounded-full bg-canvas pl-3 pr-1.5 py-1">
                      <button
                        type="button"
                        onClick={() => commitSearch(r)}
                        className="text-[13px] font-medium text-sub"
                      >
                        {r}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRecent(r)}
                        aria-label={`${r} 최근 검색어 삭제`}
                        className="flex h-5 w-5 items-center justify-center rounded-full text-faint hover:text-sub"
                      >
                        <CloseIcon small />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="shrink-0 text-faint" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
function CloseIcon({ small }: { small?: boolean }) {
  const s = small ? 10 : 14;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
