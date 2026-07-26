"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import FormField from "@/components/ui/FormField";
import { FormattedDateTime } from "@/hooks/useTimezone";
import PhoneInput from "@/components/ui/PhoneInput";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from "@/lib/i18n/types";
import { getLocaleLabel } from "@/lib/i18n";
import { useT } from "@/components/LanguageProvider";

const TIMEZONES = [
  "Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura",
  "Asia/Singapore", "Asia/Kuala_Lumpur",
  "Asia/Bangkok", "Asia/Ho_Chi_Minh",
  "Asia/Tokyo", "Asia/Seoul",
  "Asia/Shanghai", "Asia/Hong_Kong",
  "Asia/Taipei", "Asia/Kolkata",
  "Asia/Dhaka", "Asia/Karachi",
  "Asia/Dubai", "Asia/Riyadh",
  "Europe/London", "Europe/Paris", "Europe/Berlin",
  "Europe/Istanbul", "Europe/Moscow",
  "America/New_York", "America/Chicago",
  "America/Denver", "America/Los_Angeles",
  "Pacific/Auckland", "Australia/Sydney",
];

function getTimezoneOffset(tz: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en", { timeZone: tz, timeZoneName: "longOffset" });
    const parts = formatter.formatToParts(now);
    const offset = parts.find((p) => p.type === "timeZoneName")?.value.replace("GMT", "UTC");
    return offset ? `(${offset})` : "";
  } catch {
    return "";
  }
}

const TIMEZONE_OPTIONS = TIMEZONES.map((tz) => ({ value: tz, label: `${getTimezoneOffset(tz)} ${tz}` }));

export default function EditProfilePage() {
  const router = useRouter();
  const t = useT();

  const [userId, setUserId] = useState("");
  const [username, setUsername] = useState("");
  const [groupName, setGroupName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState("Asia/Jakarta");
  const [language, setLanguage] = useState<string>(DEFAULT_LOCALE);
  const [biography, setBiography] = useState("");

  const [isActive, setIsActive] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);
  const [createdAt, setCreatedAt] = useState("");
  const [createdByName, setCreatedByName] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [updatedByName, setUpdatedByName] = useState("");

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = `Edit Profile - ${process.env.NEXT_PUBLIC_APP_NAME || "Boilerplate"}`; }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.status === 401) { router.replace("/account/signin"); return; }
        if (!cancelled && res.ok) {
          const user = await res.json();
          setUserId(user._id);
          setUsername(user.username || "");
          setGroupName(user.groupName || "");
          setFullName(user.fullName || "");
          setEmail(user.email || "");
          setPhone(user.phone || "");
          setTimezone(user.timezone || "Asia/Jakarta");
          setLanguage(user.language || DEFAULT_LOCALE);
          setBiography(user.biography || "");
          setIsActive(user.isActive !== false);
          setEmailVerified(user.emailVerified || false);
          setCreatedAt(user.created?.at || "");
          setCreatedByName(user.createdByName || "");
          setUpdatedAt(user.updated?.at || "");
          setUpdatedByName(user.updatedByName || "");
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const res = await fetch("/api/system/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: userId, fullName, email, phone, timezone, language, biography }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update profile.");
      }

      router.push("/account/profile?updated=true");
      router.refresh();
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto space-y-6 pb-10">
      <PageHeader
        title={t("profile.editTitle")}
        subtitle={
          <>
            Editing: <span className="font-bold text-emerald-600">{fullName}</span>
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/account/profile"
              className="bg-white dark:bg-stone-800/40 border border-gray-200 dark:border-stone-700/50 text-xs px-4 py-2 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-stone-700 transition-all"
            >
              {t("common.cancel")}
            </Link>
            <button
              type="submit"
              form="profile-edit-form"
              disabled={saving}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl font-bold text-xs shadow-md shadow-emerald-500/10 transition-all hover:scale-105 active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              {saving ? t("common.loading") : t("common.save")}
            </button>
          </div>
        }
      />

      <form id="profile-edit-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white dark:bg-stone-900/80 p-6 rounded-2xl border border-gray-200 dark:border-stone-700/50 shadow-sm">
            {error && (
              <div className="mb-6 p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="Username">
                <input
                  type="text"
                  value={username}
                  readOnly
                  className="w-full px-4 py-2.5 bg-gray-100 dark:bg-stone-800/40 border border-gray-200 dark:border-stone-700/50 rounded-xl text-sm font-bold text-gray-500 dark:text-stone-400 cursor-not-allowed"
                />
              </FormField>

              <FormField label="Group">
                <input
                  type="text"
                  value={groupName || "—"}
                  readOnly
                  className="w-full px-4 py-2.5 bg-gray-100 dark:bg-stone-800/40 border border-gray-200 dark:border-stone-700/50 rounded-xl text-sm font-bold text-gray-500 dark:text-stone-400 cursor-not-allowed"
                />
              </FormField>

              <FormField label="Full Name" required>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-stone-800/40 border border-transparent focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 transition-colors"
                  placeholder="Enter full name"
                  required
                />
              </FormField>

              <FormField label="Email" required>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-stone-800/40 border border-transparent focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 transition-colors"
                  placeholder="Enter email address"
                  required
                />
              </FormField>

              <FormField label="Phone Number">
                <PhoneInput
                  value={phone}
                  onChange={setPhone}
                  placeholder="Phone number"
                />
              </FormField>
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900/80 p-6 rounded-2xl border border-gray-200 dark:border-stone-700/50 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                  {t("profile.timezone")}
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-stone-800/40 border border-transparent focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white transition-colors"
                >
                  {TIMEZONE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                  {t("profile.language")}
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-stone-800/40 border border-transparent focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white transition-colors"
                >
                  {SUPPORTED_LOCALES.map((loc) => (
                    <option key={loc} value={loc}>{getLocaleLabel(loc)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900/80 p-6 rounded-2xl border border-gray-200 dark:border-stone-700/50 shadow-sm">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                {t("profile.biography")} <span className="text-gray-300 normal-case tracking-normal font-normal">(optional)</span>
              </label>
              <textarea
                value={biography}
                onChange={(e) => setBiography(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-stone-800/40 border border-transparent focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 resize-none transition-colors"
                placeholder="Brief description about yourself"
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-stone-900/80 p-5 rounded-2xl border border-gray-200 dark:border-stone-700/50 shadow-sm text-xs space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-655">
              {t("profile.information")}
            </h3>

            {userId && (
              <Link
                href={`/author/${userId}`}
                target="_blank"
                className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors font-bold"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                View Public Profile
              </Link>
            )}

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t("profile.username")}</p>
              <p className="mt-0.5 text-sm font-bold text-gray-900 dark:text-white">{username}</p>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t("profile.group")}</p>
              <p className="mt-0.5 text-sm font-bold text-gray-900 dark:text-white">{groupName || "—"}</p>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t("profile.status")}</p>
              <span className={`inline-flex mt-0.5 items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                isActive
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-green-500" : "bg-red-500"}`} />
                {isActive ? t("profile.active") : t("profile.inactive")}
              </span>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t("profile.emailVerified")}</p>
              <span className={`inline-flex mt-0.5 items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                emailVerified
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
              }`}>
                {emailVerified ? "Verified" : "Unverified"}
              </span>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Created</p>
              <p className="mt-0.5 text-sm font-bold text-gray-900 dark:text-white">
                {createdAt ? <FormattedDateTime date={createdAt} /> : "—"}
              </p>
              {createdByName && (
                <p className="text-[10px] text-gray-500 mt-0.5">by {createdByName}</p>
              )}
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Updated</p>
              <p className="mt-0.5 text-sm font-bold text-gray-900 dark:text-white">
                {updatedAt ? <FormattedDateTime date={updatedAt} /> : "—"}
              </p>
              {updatedByName && (
                <p className="text-[10px] text-gray-500 mt-0.5">by {updatedByName}</p>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
