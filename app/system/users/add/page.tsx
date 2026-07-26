"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import FormField from "@/components/ui/FormField";
import { TIMEZONE_OPTIONS, DEFAULT_TIMEZONE } from "@/lib/timezone";
import Toggle from "@/components/ui/Toggle";
import { useT } from "@/components/LanguageProvider";

export default function AddUserPage() {
  const router = useRouter();
  const t = useT();
  const [groups, setGroups] = useState<{ _id: string; name: string }[]>([]);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [groupId, setGroupId] = useState("");
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [biography, setBiography] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => { document.title = "Add User - Boilerplate"; }, []);

  useEffect(() => {
    fetch("/api/system/groups")
      .then((r) => r.json())
      .then(setGroups)
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const res = await fetch("/api/system/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, fullName, email, password, groupId: groupId || null, timezone, biography, isActive }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create user.");
      }

      const created = await res.json();
      router.push(`/system/users/${created._id}?created=true`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-full mx-auto space-y-6 pb-10">
      <PageHeader
        title={t("users.add")}
        subtitle="Create a new system user"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/system/users"
              className="bg-white dark:bg-stone-800/40 border border-gray-200 dark:border-stone-700/50 text-xs px-4 py-2 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-stone-700 transition-all"
            >
              {t("common.cancel")}
            </Link>
            <button
              type="submit"
              form="user-add-form"
              disabled={saving}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl font-bold text-xs shadow-md shadow-emerald-500/10 transition-all hover:scale-105 active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {saving ? t("common.loading") : t("actions.create") + " " + t("users.title")}
            </button>
          </div>
        }
      />

      <form id="user-add-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left column — form */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white dark:bg-stone-900/80 p-6 rounded-2xl border border-gray-200 dark:border-stone-700/50 shadow-sm">
            {error && (
              <div className="mb-6 p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 text-red-650 dark:text-red-400 rounded-xl text-xs font-bold">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label={t("users.username")} required>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-stone-800/40 border border-transparent focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 transition-colors"
                  placeholder="Enter username"
                  required
                />
              </FormField>

              <FormField label={t("users.fullName")} required>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-stone-800/40 border border-transparent focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 transition-colors"
                  placeholder="Enter full name"
                  required
                />
              </FormField>

              <FormField label={t("users.email")} required>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-stone-800/40 border border-transparent focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 transition-colors"
                  placeholder="Enter email address"
                  required
                />
              </FormField>

              <FormField label={t("users.password")} required>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-stone-800/40 border border-transparent focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 transition-colors"
                    placeholder="Enter password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 dark:text-stone-500 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
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
              </FormField>

              <FormField label={t("users.group")}>
                <select
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-stone-800/40 border border-transparent focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white appearance-none cursor-pointer transition-colors"
                >
                  <option value="">No group</option>
                  {groups.map((g) => (
                    <option key={g._id} value={g._id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label={t("users.timezone")}>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-stone-800/40 border border-transparent focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white appearance-none cursor-pointer transition-colors"
                >
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label} ({tz.offset})
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          </div>

          {/* Biography */}
          <div className="bg-white dark:bg-stone-900/80 p-6 rounded-2xl border border-gray-200 dark:border-stone-700/50 shadow-sm">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                {t("users.biography")} <span className="text-gray-300 normal-case tracking-normal font-normal">(optional)</span>
              </label>
              <textarea
                value={biography}
                onChange={(e) => setBiography(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-stone-800/40 border border-transparent focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 resize-none transition-colors"
                placeholder="Brief description about the user"
                rows={3}
              />
            </div>
          </div>

          {/* Status toggle */}
          <div className="bg-white dark:bg-stone-900/80 p-6 rounded-2xl border border-gray-200 dark:border-stone-700/50 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{t("users.status")}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {t("users.inactiveCannotSignIn")}
              </p>
            </div>
            <Toggle
              id="user-status-toggle"
              checked={isActive}
              onChange={() => setIsActive(!isActive)}
              label={isActive ? t("status.active") : t("status.inactive")}
            />
          </div>
        </div>

        {/* Right column — info cards */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-stone-900/80 p-4 rounded-2xl border border-gray-200 dark:border-stone-700/50 shadow-sm">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-655 mb-3">
              {t("users.accountSecurity")}
            </h3>
            <p className="text-gray-500 leading-relaxed italic text-xs">
              {t("users.accountSecurityNote")}
            </p>
          </div>

          <div className="bg-white dark:bg-stone-900/80 p-4 rounded-2xl border border-gray-200 dark:border-stone-700/50 shadow-sm text-xs">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-655 mb-3">
              {t("users.userInformation")}
            </h3>
            <p className="text-gray-500 leading-relaxed italic mb-3">
              {t("users.userInformationNote")}
            </p>
            <div className="pt-3 border-t border-gray-100 dark:border-stone-700/50 space-y-2">
              <div className="flex justify-between text-[10px]">
                <span className="text-gray-400">{t("users.group")}:</span>
                <span className="font-bold text-gray-700 dark:text-stone-300">{groupId ? groups.find((g) => g._id === groupId)?.name || "—" : t("common.none")}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-gray-400">{t("users.timezone")}:</span>
                <span className="font-bold text-gray-700 dark:text-stone-300">{timezone}</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
