"use client";

import { useState, useRef, useEffect, Suspense, type ClipboardEvent, type KeyboardEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const DIGIT_COUNT = 6;

function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [digits, setDigits] = useState<string[]>(Array(DIGIT_COUNT).fill(""));
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);
    setError("");

    if (value && index < DIGIT_COUNT - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    const allFilled = newDigits.every((d) => d !== "");
    if (allFilled) {
      submitOtp(newDigits.join(""));
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      const newDigits = [...digits];
      newDigits[index - 1] = "";
      setDigits(newDigits);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, DIGIT_COUNT);
    if (!pasted) return;

    const newDigits = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);

    if (pasted.length === DIGIT_COUNT) {
      submitOtp(pasted);
    } else {
      const nextIndex = Math.min(pasted.length, DIGIT_COUNT - 1);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  const submitOtp = async (otp: string) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Verification failed.");
        setDigits(Array(DIGIT_COUNT).fill(""));
        inputRefs.current[0]?.focus();
        return;
      }

      setSuccess("Email verified! Redirecting…");
      setTimeout(() => { window.location.href = "/dashboard"; }, 1000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError("");

    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to resend.");
        return;
      }

      setSuccess("A new code has been sent!");
      setDigits(Array(DIGIT_COUNT).fill(""));
      inputRefs.current[0]?.focus();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setResending(false);
    }
  };

  if (!email) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 via-white to-zinc-50 p-4 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 dark:border-white/[0.08] dark:bg-white/[0.03]">
          <p className="text-zinc-500 dark:text-zinc-400">No email provided.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 via-white to-zinc-50 p-4 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-600/10 blur-[120px] dark:bg-indigo-600/15" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-2xl backdrop-blur-xl dark:border-white/[0.08] dark:bg-white/[0.03]">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 9v.906a2.25 2.25 0 0 1-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 0 0 1.183 1.981l6.478 3.488m8.839 2.51-4.66-2.51m0 0-1.023-.55a2.25 2.25 0 0 0-2.134 0l-1.022.55m0 0-4.661 2.51m16.5 1.615a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V8.844a2.25 2.25 0 0 1 1.183-1.981l7.5-4.039a2.25 2.25 0 0 1 2.134 0l7.5 4.039a2.25 2.25 0 0 1 1.183 1.98V19.5Z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
              Verify your email
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              Enter the 6-digit code sent to{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{email}</span>
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-lg border border-red-500/20 bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-5 rounded-lg border border-emerald-500/20 bg-emerald-50 px-4 py-3 text-sm text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
              {success}
            </div>
          )}

          <div className="space-y-6">
            <fieldset disabled={loading}>
              <div className="grid grid-cols-6 gap-3 sm:gap-4">
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    className="flex h-14 w-full items-center justify-center rounded-lg border border-zinc-300 bg-zinc-50 text-center text-xl font-semibold text-zinc-900 outline-none transition focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white sm:h-16"
                    aria-label={`Digit ${index + 1}`}
                  />
                ))}
              </div>
            </fieldset>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || loading}
                className="text-sm text-indigo-600 transition hover:text-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                {resending ? "Sending…" : "Resend code"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 via-white to-zinc-50 p-4 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      }
    >
      <VerifyOtpForm />
    </Suspense>
  );
}
