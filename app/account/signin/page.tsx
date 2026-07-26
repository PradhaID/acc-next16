"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { UserIcon, LockClosedIcon } from "@heroicons/react/24/solid";
import { useSettings } from "@/lib/settings-context";
import { useT } from "@/components/LanguageProvider";

export default function SignInPage() {
  const settings = useSettings();
  const t = useT();
  const [form, setForm] = useState({
    identifier: "",
    password: "",
    rememberMe: false,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resending, setResending] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const VERIFY_ERROR = "Please verify your email before signing in.";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    setError("");
    setNeedsVerification(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === VERIFY_ERROR) {
          setNeedsVerification(true);
        }
        setError(data.error || "Something went wrong.");
        return;
      }

      setSuccess(`Welcome back, ${data.user.fullName}!`);
      setTimeout(() => { window.location.href = "/dashboard"; }, 500);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResending(true);
    setError("");

    try {
      let email = form.identifier.trim();

      if (!email.includes("@")) {
        const lookupRes = await fetch("/api/auth/lookup-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: email }),
        });
        if (!lookupRes.ok) {
          setError("Could not find account. Please check your email or username.");
          return;
        }
        const lookupData = await lookupRes.json();
        email = lookupData.email;
      }

      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to resend verification email.");
        return;
      }

      window.location.href = `/account/verify-otp?email=${encodeURIComponent(email)}`;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-50 transition-colors duration-300">
      {/* Decorative ambient glowing orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-[600px] w-[600px] bg-gradient-to-tr from-emerald-500/10 via-emerald-500/5 to-emerald-500/10 blur-3xl rounded-full" />
      
      {/* App branding header */}
      <div className="mb-6 flex flex-col items-center gap-2">
        <Link href="/" className="flex items-center gap-3">
          <img src="/img/logo.webp" alt="Logo" width="36" height="36" className="h-9 w-9 rounded-xl object-contain shadow-md shadow-emerald-500/25" />
          <span className="text-lg font-bold tracking-tight text-stone-900 dark:text-white">
            {process.env.NEXT_PUBLIC_APP_NAME || "Pradha Finance"}
          </span>
        </Link>
      </div>

      {/* Main card */}
      <div className="w-full max-w-md bg-white/80 dark:bg-stone-900/80 backdrop-blur-md shadow-xl rounded-2xl border border-stone-200/60 dark:border-stone-800/60 p-8 sm:p-10">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-stone-850 dark:text-white">{t("auth.signInTitle")}</h2>
          <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400">
            {t("auth.signInSubtitle")}
          </p>
        </div>

        {error && !needsVerification && (
          <div className="mb-4 bg-red-50/80 border border-red-200/50 text-red-650 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 px-4 py-3 rounded-xl text-sm font-medium text-center">
            {error}
          </div>
        )}
        {needsVerification && (
          <div className="mb-4 bg-emerald-50/80 border border-emerald-200/60 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800/30 dark:text-emerald-400 px-4 py-4 rounded-xl text-sm text-center space-y-3">
            <div className="flex items-center justify-center gap-2 font-semibold">
              <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.981l7.5-4.039a2.25 2.25 0 012.134 0l7.5 4.039a2.25 2.25 0 011.183 1.98V19.5z" />
              </svg>
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resending}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-stone-900 px-4 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 shadow-sm hover:bg-emerald-50 dark:hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {resending ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                  Sending...
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                  </svg>
                  Resend verification email
                </>
              )}
            </button>
          </div>
        )}
        {success && (
          <div className="mb-4 bg-emerald-50/80 border border-emerald-200/50 text-emerald-650 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-450 px-4 py-3 rounded-xl text-sm font-medium text-center">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset disabled={loading} className="space-y-4">
            <div>
              <label htmlFor="identifier" className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5 ml-1">
                {t("auth.identifier")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-500/60">
                  <UserIcon className="h-5 w-5" />
                </div>
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  required
                  autoComplete="username"
                  value={form.identifier}
                  onChange={handleChange}
                  placeholder="Enter email or username"
                  className="w-full pl-11 pr-4 py-2.5 border border-stone-200 dark:border-stone-800/80 rounded-xl bg-stone-50/50 dark:bg-stone-950/40 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white dark:focus:bg-stone-950 transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5 ml-1">
                <label htmlFor="password" className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                  {t("auth.password")}
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-500/60">
                  <LockClosedIcon className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter password"
                  className="w-full pl-11 pr-10 py-2.5 border border-stone-200 dark:border-stone-800/80 rounded-xl bg-stone-50/50 dark:bg-stone-950/40 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white dark:focus:bg-stone-950 transition-all text-sm font-bold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 dark:text-stone-500 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-label={t("auth.hidePassword")}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-label={t("auth.showPassword")}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 bg-gradient-to-r from-emerald-500 via-emerald-500 to-emerald-500 hover:from-emerald-600 hover:to-emerald-600 text-white font-semibold py-2.5 rounded-xl shadow-md shadow-emerald-500/10 active:scale-[0.98] transition-all text-sm cursor-pointer"
            >
              {loading ? t("common.loading") : t("auth.signIn")}
            </button>

            <div className="flex items-center gap-2 pt-1">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                checked={form.rememberMe}
                onChange={handleChange}
                className="h-4 w-4 rounded border-stone-300 text-emerald-500 focus:ring-emerald-500"
              />
              <label htmlFor="rememberMe" className="text-xs text-stone-500 dark:text-stone-400">
                {t("auth.rememberMe")}
              </label>
            </div>
          </fieldset>
        </form>

        <div className="mt-6 text-center space-y-2">
          {settings.enable_signup && (
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Don&apos;t have an account?{" "}
              <Link
                href="/account/signup"
                className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline transition-colors ml-0.5"
              >
                Create one
              </Link>
            </p>
          )}
          <p className="text-xs text-stone-500 dark:text-stone-400">
              <Link
                href="/account/forgot-password"
                className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline transition-colors"
              >
                {t("auth.forgotPassword")}
              </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
