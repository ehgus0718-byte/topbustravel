"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginFlow />
    </Suspense>
  );
}

type Step = "phone" | "code" | "signup";

function LoginFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const rawNext = params.get("next") || "/my";
  const next = rawNext.startsWith("/") ? rawNext : "/my"; // open redirect 방지

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [signupToken, setSignupToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ttl, setTtl] = useState(0); // 인증번호 남은 초
  const [cooldown, setCooldown] = useState(0); // 재발송 대기 초
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTtl((v) => (v > 0 ? v - 1 : 0));
      setCooldown((v) => (v > 0 ? v - 1 : 0));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatPhone = (v: string) =>
    v
      .replace(/\D/g, "")
      .slice(0, 11)
      .replace(/(\d{3})(\d{1,4})?(\d{1,4})?/, (_, a, b, c) =>
        [a, b, c].filter(Boolean).join("-")
      );

  async function sendOtp() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep("code");
      setCode("");
      setTtl(data.ttl ?? 180);
      setCooldown(60);
    } catch (e: any) {
      setError(e.message || "발송에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.status === "logged_in") {
        router.replace(next);
        router.refresh();
        return;
      }
      setSignupToken(data.signupToken);
      setStep("signup");
    } catch (e: any) {
      setError(e.message || "인증에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function register() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signupToken, name, agree }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.replace(next);
      router.refresh();
    } catch (e: any) {
      setError(e.message || "가입에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const mmss = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="px-5 pb-16 pt-10 md:pt-16">
      <h1 className="text-[22px] font-extrabold md:text-3xl">
        {step === "signup" ? "가입을 완료해 주세요" : "휴대폰 번호로 로그인"}
      </h1>
      <p className="mt-1.5 text-[13px] text-sub md:text-sm">
        {step === "signup"
          ? "인증이 완료되었습니다. 이름만 입력하면 끝이에요."
          : "가입하지 않았어도 인증하면 자동으로 가입됩니다."}
      </p>

      <div className="mt-7 space-y-4">
        {/* STEP 1+2: 휴대폰 번호 */}
        {step !== "signup" && (
          <div>
            <label htmlFor="phone" className="mb-1.5 block text-[13px] font-semibold text-sub">
              휴대폰 번호
            </label>
            <div className="flex gap-2">
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="010-0000-0000"
                value={phone}
                disabled={step === "code"}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && step === "phone" && sendOtp()}
                className="h-12 flex-1 rounded-xl border border-line px-4 text-[16px] font-medium outline-none focus:border-primary disabled:bg-canvas disabled:text-faint"
              />
              {step === "code" && (
                <button
                  type="button"
                  onClick={() => {
                    setStep("phone");
                    setTtl(0);
                    setError("");
                  }}
                  className="h-12 shrink-0 rounded-xl border border-line px-4 text-[14px] font-semibold text-sub"
                >
                  변경
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 1: 발송 버튼 */}
        {step === "phone" && (
          <button
            type="button"
            onClick={sendOtp}
            disabled={loading || phone.replace(/\D/g, "").length < 10}
            className="h-12 w-full rounded-xl bg-primary text-[15px] font-bold text-white transition active:scale-[0.99] disabled:opacity-40"
          >
            {loading ? "발송 중..." : "인증번호 받기"}
          </button>
        )}

        {/* STEP 2: 인증번호 */}
        {step === "code" && (
          <>
            <div>
              <label htmlFor="code" className="mb-1.5 block text-[13px] font-semibold text-sub">
                인증번호 6자리
              </label>
              <div className="relative">
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && verifyOtp()}
                  className="h-12 w-full rounded-xl border border-line px-4 text-[18px] font-bold tracking-[0.3em] outline-none focus:border-primary"
                />
                <span
                  className={`absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-semibold ${
                    ttl <= 30 ? "text-accent" : "text-sub"
                  }`}
                  aria-live="polite"
                >
                  {ttl > 0 ? mmss(ttl) : "만료됨"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={verifyOtp}
              disabled={loading || code.length !== 6 || ttl === 0}
              className="h-12 w-full rounded-xl bg-primary text-[15px] font-bold text-white transition active:scale-[0.99] disabled:opacity-40"
            >
              {loading ? "확인 중..." : "인증하고 로그인"}
            </button>
            <button
              type="button"
              onClick={sendOtp}
              disabled={cooldown > 0 || loading}
              className="w-full py-1 text-center text-[13px] font-medium text-faint underline-offset-2 hover:underline disabled:no-underline disabled:opacity-50"
            >
              {cooldown > 0 ? `인증번호 재발송 (${cooldown}초 후)` : "인증번호 재발송"}
            </button>
          </>
        )}

        {/* STEP 3: 신규 가입 */}
        {step === "signup" && (
          <>
            <div>
              <label htmlFor="name" className="mb-1.5 block text-[13px] font-semibold text-sub">
                이름
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                maxLength={20}
                placeholder="예약자 이름"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && agree && register()}
                className="h-12 w-full rounded-xl border border-line px-4 text-[16px] font-medium outline-none focus:border-primary"
              />
            </div>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-line p-3.5">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="mt-0.5 h-4.5 w-4.5 accent-[var(--color-primary)]"
              />
              <span className="text-[13px] leading-relaxed text-sub">
                <b className="text-ink">[필수]</b> 이용약관 및 개인정보 수집·이용에
                동의합니다. (이름·휴대폰 번호는 예약 확인과 알림 발송에만 사용됩니다)
              </span>
            </label>
            <button
              type="button"
              onClick={register}
              disabled={loading || !name.trim() || !agree}
              className="h-12 w-full rounded-xl bg-primary text-[15px] font-bold text-white transition active:scale-[0.99] disabled:opacity-40"
            >
              {loading ? "처리 중..." : "🎉 가입 완료하고 시작하기"}
            </button>
          </>
        )}

        {error && (
          <p className="rounded-xl bg-accent/10 px-4 py-3 text-[13px] font-semibold text-accent" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
