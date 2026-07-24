"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/", label: "홈" },
  { href: "/products", label: "여행상품" },
  { href: "/reservation/lookup", label: "예약조회" },
  { href: "/contact", label: "문의" },
];

export default function Header({
  tel,
  user,
}: {
  tel: string;
  user?: { name: string } | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const authHref = user ? "/my" : "/login";
  const authLabel = user ? `${user.name}님` : "로그인";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:h-16 md:px-6">
        <Link href="/" onClick={close} className="flex items-baseline gap-0.5">
          <span className="text-xl font-extrabold tracking-tight text-primary md:text-2xl">
            topBus
          </span>
          <span className="text-xl font-light tracking-tight text-ink md:text-2xl">
            travel
          </span>
        </Link>

        {/* 데스크톱 내비게이션 */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="주 메뉴">
          {NAV.map(({ href, label }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-lg px-3.5 py-2 text-[15px] font-semibold transition hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                  active ? "text-primary" : "text-sub"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5 md:gap-2">
          <Link
            href={authHref}
            onClick={close}
            className={`hidden items-center gap-1 rounded-full border border-line px-3 py-1.5 text-sm font-semibold transition hover:border-primary hover:text-primary sm:flex md:px-4 md:py-2 ${
              pathname.startsWith(authHref) ? "text-primary" : "text-sub"
            }`}
          >
            <UserIcon />
            {authLabel}
          </Link>
          <Link
            href="/my#wishlist"
            onClick={close}
            aria-label="찜한 여행"
            className={`hidden h-10 w-10 items-center justify-center rounded-full text-ink transition hover:bg-canvas md:flex ${
              pathname === "/my" ? "text-primary" : ""
            }`}
          >
            <HeartIcon />
          </Link>
          <a
            href={`tel:${tel.replace(/-/g, "")}`}
            className="flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-sm font-semibold text-primary md:px-4 md:py-2"
          >
            <PhoneIcon />
            {tel}
          </a>

          {/* 모바일 햄버거 */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-ink transition hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary md:hidden"
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {/* 모바일 메뉴 패널 */}
      {open && (
        <nav
          id="mobile-menu"
          aria-label="모바일 메뉴"
          className="border-t border-line bg-white md:hidden"
        >
          <Link
            href={authHref}
            onClick={close}
            className="flex items-center gap-2 border-b border-line bg-canvas px-5 py-3.5 text-[15px] font-bold text-ink"
          >
            <UserIcon />
            {user ? `${user.name}님 · 마이페이지` : "로그인 / 회원가입"}
          </Link>
          {NAV.map(({ href, label }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={close}
                className={`block px-5 py-3.5 text-[15px] font-semibold ${
                  active ? "bg-primary-soft text-primary" : "text-ink"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}

function PhoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
