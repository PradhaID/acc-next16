"use client";

import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserIcon, LockClosedIcon, EnvelopeIcon } from "@heroicons/react/24/solid";
import PhoneInput from "@/components/ui/PhoneInput";
import PasswordStrength from "@/components/ui/PasswordStrength";
import { useT } from "@/components/LanguageProvider";

export default function SignUpPage() {
  const router = useRouter();
  const t = useT();
  const [signupAllowed, setSignupAllowed] = useState<boolean | null>(null);
  const [form, setForm] = useState({
    username: "",
    fullName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetch("/api/auth/settings")
      .then((r) => r.json())
      .then((data) => setSignupAllowed(!!data.enableSignup))
      .catch(() => setSignupAllowed(true));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      setSuccess(data.message);
      setTimeout(() => { window.location.href = data.redirectUrl; }, 1000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-50 transition-colors duration-300">
      {/* Decorative ambient glowing orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-[600px] w-[600px] bg-gradient-to-tr from-amber-500/10 via-orange-550/5 to-rose-500/10 blur-3xl rounded-full" />

      {/* App branding header */}
      <div className="mb-6 flex flex-col items-center gap-2">
        <Link href="/" className="flex items-center gap-3">
          <img src="/img/logo.webp" alt="Logo" width="36" height="36" className="h-9 w-9 rounded-xl object-contain shadow-md shadow-orange-500/25" />
          <span className="text-lg font-bold tracking-tight text-stone-900 dark:text-white">
            {process.env.NEXT_PUBLIC_APP_NAME || "boilerplate-next16"}
          </span>
        </Link>
      </div>

      {signupAllowed === false ? (
        <div className="w-full max-w-md bg-white/80 dark:bg-stone-900/80 backdrop-blur-md shadow-xl rounded-2xl border border-stone-200/60 dark:border-stone-800/60 p-8 sm:p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/30">
            <svg className="h-7 w-7 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-stone-900 dark:text-white mb-2">Registration Closed</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">
            New account registration is currently disabled. Please contact the administrator.
          </p>
          <Link
            href="/account/signin"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-orange-500/10 transition-all hover:scale-105 active:scale-95"
          >
            Go to Sign In
          </Link>
        </div>
      ) : (
      <>
      {/* Main card */}
      <div className="w-full max-w-md bg-white/80 dark:bg-stone-900/80 backdrop-blur-md shadow-xl rounded-2xl border border-stone-200/60 dark:border-stone-800/60 p-8 sm:p-10">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-stone-850 dark:text-white">{t("auth.createTitle")}</h2>
          <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400">
            {t("auth.createSubtitle")}
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50/80 border border-red-200/50 text-red-650 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 px-4 py-3 rounded-xl text-sm font-medium text-center">
            {error}
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
              <label htmlFor="username" className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5 ml-1">
                {t("auth.username")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-500/60">
                  <UserIcon className="h-5 w-5" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="Enter a username"
                  className="w-full pl-11 pr-4 py-2.5 border border-stone-200 dark:border-stone-800/80 rounded-xl bg-stone-50/50 dark:bg-stone-950/40 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 focus:bg-white dark:focus:bg-stone-950 transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="fullName" className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5 ml-1">
                {t("auth.fullName")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-500/60">
                  <UserIcon className="h-5 w-5" />
                </div>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  autoComplete="name"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className="w-full pl-11 pr-4 py-2.5 border border-stone-200 dark:border-stone-800/80 rounded-xl bg-stone-50/50 dark:bg-stone-950/40 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 focus:bg-white dark:focus:bg-stone-950 transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5 ml-1">
                {t("auth.email")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-500/60">
                  <EnvelopeIcon className="h-5 w-5" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  className="w-full pl-11 pr-4 py-2.5 border border-stone-200 dark:border-stone-800/80 rounded-xl bg-stone-50/50 dark:bg-stone-950/40 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 focus:bg-white dark:focus:bg-stone-950 transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5 ml-1">
                Phone Number <span className="text-stone-300 normal-case tracking-normal font-normal">(optional)</span>
              </label>
              <PhoneInput
                value={form.phone}
                onChange={(val) => setForm((prev) => ({ ...prev, phone: val }))}
                placeholder="Phone number"
              />
            </div>

             <div>
              <label htmlFor="password" className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5 ml-1">
                {t("auth.password")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-500/60">
                  <LockClosedIcon className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Create a password"
                  className="w-full pl-11 pr-10 py-2.5 border border-stone-200 dark:border-stone-800/80 rounded-xl bg-stone-50/50 dark:bg-stone-950/40 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 focus:bg-white dark:focus:bg-stone-950 transition-all text-sm font-bold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 dark:text-stone-500 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
                >
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
              <PasswordStrength password={form.password} className="mt-2" />
            </div>

            <button
              type="submit"
              className="w-full mt-2 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-semibold py-2.5 rounded-xl shadow-md shadow-orange-500/10 active:scale-[0.98] transition-all text-sm cursor-pointer"
            >
              {loading ? t("common.loading") : t("auth.createAccount")}
            </button>
          </fieldset>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {t("auth.alreadyHave")}{" "}
            <Link
              href="/account/signin"
              className="text-orange-650 dark:text-orange-400 font-bold hover:underline transition-colors ml-0.5"
            >
              {t("auth.signIn")}
            </Link>
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            <Link
              href="/account/forgot-password"
              className="text-orange-650 dark:text-orange-400 font-bold hover:underline transition-colors"
            >
              Forgot password?
            </Link>
          </p>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
