"use client";

import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LanguageProvider";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const t = useT();
  const [identifier, setIdentifier] = useState("");
  const [method, setMethod] = useState<"email" | "whatsapp">("email");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);

  useEffect(() => {
    fetch("/api/auth/settings")
      .then((r) => r.json())
      .then((data) => setWhatsappEnabled(!!data.enableWhatsappOtp && !!data.wahaConfigured))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!whatsappEnabled && method === "whatsapp") setMethod("email");
  }, [whatsappEnabled, method]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), method }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      setSuccess(data.message || "If an account exists, a verification code has been sent.");
      setTimeout(() => {
        if (data.method === "whatsapp") {
          router.push(`/account/reset-password?identifier=${encodeURIComponent(data.identifier)}&method=whatsapp`);
        } else {
          router.push(`/account/reset-password?identifier=${encodeURIComponent(data.identifier)}&method=email`);
        }
      }, 1500);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-50 transition-colors duration-300">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-[600px] w-[600px] bg-gradient-to-tr from-emerald-500/10 via-emerald-500/5 to-emerald-500/10 blur-3xl rounded-full" />

      <div className="mb-6 flex flex-col items-center gap-2">
        <Link href="/" className="flex items-center gap-3">
          <img src="/img/logo.webp" alt="Logo" width="36" height="36" className="h-9 w-9 rounded-xl object-contain shadow-md shadow-emerald-500/25" />
          <span className="text-lg font-bold tracking-tight text-stone-900 dark:text-white">
            {process.env.NEXT_PUBLIC_APP_NAME || "Pradha Finance"}
          </span>
        </Link>
      </div>

      <div className="w-full max-w-md bg-white/80 dark:bg-stone-900/80 backdrop-blur-md shadow-xl rounded-2xl border border-stone-200/60 dark:border-stone-800/60 p-8 sm:p-10">
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/20">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-stone-850 dark:text-white">{t("auth.forgotTitle")}</h2>
          <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400">
            {t("auth.forgotSubtitle").replace("{contact}", whatsappEnabled ? t("auth.emailOrPhone") : t("auth.email"))}
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
              <label htmlFor="identifier" className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5 ml-1">
                {whatsappEnabled ? t("auth.emailOrPhone") : t("auth.email")}
              </label>
              <input
                id="identifier"
                type={whatsappEnabled ? "text" : "email"}
                required
                value={identifier}
                onChange={(e) => { setIdentifier(e.target.value); setError(""); }}
                placeholder={whatsappEnabled ? "Enter email or phone number" : "Enter your email"}
                className="w-full px-4 py-2.5 border border-stone-200 dark:border-stone-800/80 rounded-xl bg-stone-50/50 dark:bg-stone-950/40 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white dark:focus:bg-stone-950 transition-all text-sm"
              />
            </div>

            {whatsappEnabled && (
              <div>
                <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2 ml-1">
                  {t("auth.sendVia")}
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setMethod("email")}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                      method === "email"
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                        : "border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-900"
                    }`}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.981l7.5-4.039a2.25 2.25 0 012.134 0l7.5 4.039a2.25 2.25 0 011.183 1.98V19.5z" />
                    </svg>
                    {t("auth.email")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod("whatsapp")}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                      method === "whatsapp"
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                        : "border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-900"
                    }`}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    {t("auth.whatsapp")}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full mt-2 bg-gradient-to-r from-emerald-500 via-emerald-500 to-emerald-500 hover:from-emerald-600 hover:to-emerald-600 text-white font-semibold py-2.5 rounded-xl shadow-md shadow-emerald-500/10 active:scale-[0.98] transition-all text-sm cursor-pointer"
            >
              {loading ? t("common.loading") : t("auth.sendCode")}
            </button>
          </fieldset>
        </form>

        <p className="mt-6 text-center text-xs text-stone-500 dark:text-stone-400">
          {t("auth.rememberPassword")}{" "}
          <Link
            href="/account/signin"
            className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline transition-colors ml-0.5"
          >
            {t("auth.signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
