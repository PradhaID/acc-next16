"use client";

import { useState, useRef, useEffect, Suspense, type ClipboardEvent, type KeyboardEvent, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LockClosedIcon } from "@heroicons/react/24/solid";
import PasswordStrength from "@/components/ui/PasswordStrength";
import { useSettings } from "@/lib/settings-context";

const DIGIT_COUNT = 6;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const settings = useSettings();
  const identifier = searchParams.get("identifier") || "";
  const method = searchParams.get("method") || "email";

  const [step, setStep] = useState<"otp" | "password">("otp");
  const [digits, setDigits] = useState<string[]>(Array(DIGIT_COUNT).fill(""));
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, [step]);

  // OTP handling
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
    if (allFilled) submitOtp(newDigits.join(""));
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
    for (let i = 0; i < pasted.length; i++) newDigits[i] = pasted[i];
    setDigits(newDigits);
    if (pasted.length === DIGIT_COUNT) submitOtp(pasted);
    else inputRefs.current[Math.min(pasted.length, DIGIT_COUNT - 1)]?.focus();
  };

  const submitOtp = async (otp: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, otp, method }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Verification failed.");
        setDigits(Array(DIGIT_COUNT).fill(""));
        inputRefs.current[0]?.focus();
        return;
      }
      setResetToken(data.token);
      setStep("password");
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
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, method }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to resend."); return; }
      setSuccess("A new code has been sent!");
      setDigits(Array(DIGIT_COUNT).fill(""));
      inputRefs.current[0]?.focus();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setResending(false);
    }
  };

  // Password submission
  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to reset password.");
        return;
      }
      setSuccess("Password reset! Redirecting to sign in...");
      setTimeout(() => { window.location.href = "/account/signin"; }, 1500);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!identifier) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-stone-50 via-white to-stone-50 p-4 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950">
        <div className="rounded-2xl border border-stone-200 bg-white p-8 dark:border-white/[0.08] dark:bg-white/[0.03]">
          <p className="text-stone-500 dark:text-stone-400">No identifier provided.</p>
          <Link href="/account/forgot-password" className="mt-3 block text-sm text-emerald-600 font-bold">Go back</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-stone-50 via-white to-stone-50 p-4 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-600/10 blur-[120px] dark:bg-emerald-600/15" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Link href="/" className="flex items-center gap-3">
            <img src="/img/logo.webp" alt="Logo" width="36" height="36" className="h-9 w-9 rounded-xl object-contain shadow-md shadow-emerald-500/25" />
            <span className="text-lg font-bold tracking-tight text-stone-900 dark:text-white">
              {settings.app_name || process.env.NEXT_PUBLIC_APP_NAME || "Pradha Finance"}
            </span>
          </Link>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-2xl backdrop-blur-xl dark:border-white/[0.08] dark:bg-white/[0.03]">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/20">
              {step === "otp" ? (
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.981l7.5-4.039a2.25 2.25 0 012.134 0l7.5 4.039a2.25 2.25 0 011.183 1.98V19.5z" />
                </svg>
              ) : (
                <LockClosedIcon className="h-6 w-6 text-white" />
              )}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
              {step === "otp" ? "Verify your identity" : "Set new password"}
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              {step === "otp"
                ? <>Enter the 6-digit code sent to <span className="font-medium text-zinc-700 dark:text-zinc-300">{identifier}</span></>
                : <>Choose a strong password for your account</>
              }
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

          {step === "otp" ? (
            <div className="space-y-6">
              <fieldset disabled={loading}>
                <div className="grid grid-cols-6 gap-3 sm:gap-4">
                  {digits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={index === 0 ? handlePaste : undefined}
                      className="flex h-14 w-full items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-center text-xl font-semibold text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white sm:h-16"
                      aria-label={`Digit ${index + 1}`}
                    />
                  ))}
                </div>
              </fieldset>
              <div className="text-center space-y-3">
                <button type="button" onClick={handleResend} disabled={resending || loading}
                  className="text-sm text-emerald-600 font-bold transition hover:text-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-400 dark:hover:text-emerald-300">
                  {resending ? "Sending…" : "Resend code"}
                </button>
                <div>
                  <a href="/account/forgot-password" className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors">
                    &larr; Back to forgot password
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <fieldset disabled={loading} className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5 ml-1">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-500/60">
                      <LockClosedIcon className="h-5 w-5" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(""); }}
                      placeholder="Enter new password"
                      className="w-full pl-11 pr-10 py-2.5 border border-stone-200 dark:border-stone-800/80 rounded-xl bg-stone-50/50 dark:bg-stone-950/40 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white dark:focus:bg-stone-950 transition-all text-sm font-bold"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 dark:text-stone-500 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <PasswordStrength password={password} className="mt-2" />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5 ml-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-500/60">
                      <LockClosedIcon className="h-5 w-5" />
                    </div>
                    <input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                      placeholder="Confirm new password"
                      className="w-full pl-11 pr-4 py-2.5 border border-stone-200 dark:border-stone-800/80 rounded-xl bg-stone-50/50 dark:bg-stone-950/40 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white dark:focus:bg-stone-950 transition-all text-sm font-bold"
                    />
                  </div>
                </div>

                <button type="submit"
                  className="w-full mt-2 bg-gradient-to-r from-emerald-500 via-emerald-500 to-emerald-500 hover:from-emerald-600 hover:to-emerald-600 text-white font-semibold py-2.5 rounded-xl shadow-md shadow-emerald-500/10 active:scale-[0.98] transition-all text-sm cursor-pointer">
                  {loading ? "Resetting..." : "Reset password"}
                </button>
              </fieldset>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-stone-50 via-white to-stone-50 p-4 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
