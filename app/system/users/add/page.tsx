"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import FormField from "@/components/ui/FormField";
import { TIMEZONE_OPTIONS, DEFAULT_TIMEZONE } from "@/lib/timezone";

export default function AddUserPage() {
  const router = useRouter();
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

  useEffect(() => { document.title = "Add User - AccNext"; }, []);

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
        title="Add User"
        subtitle="Create a new system user"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/system/users"
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/50 text-xs px-4 py-2 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
            >
              Cancel
            </Link>
            <button
              type="submit"
              form="user-add-form"
              disabled={saving}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {saving ? "Creating..." : "Create User"}
            </button>
          </div>
        }
      />

      <form id="user-add-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left column — form */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm">
            {error && (
              <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="Username" required>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-indigo-500 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 transition-colors"
                  placeholder="Enter username"
                  required
                />
              </FormField>

              <FormField label="Full Name" required>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-indigo-500 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 transition-colors"
                  placeholder="Enter full name"
                  required
                />
              </FormField>

              <FormField label="Email" required>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-indigo-500 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 transition-colors"
                  placeholder="Enter email address"
                  required
                />
              </FormField>

              <FormField label="Password" required>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-indigo-500 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 transition-colors"
                  placeholder="Enter password"
                  required
                />
              </FormField>

              <FormField label="Group">
                <select
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-indigo-500 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white appearance-none cursor-pointer transition-colors"
                >
                  <option value="">No group</option>
                  {groups.map((g) => (
                    <option key={g._id} value={g._id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Timezone">
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-indigo-500 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white appearance-none cursor-pointer transition-colors"
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
        </div>

        {/* Right column — info cards */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-3">
              Account Security
            </h3>
            <p className="text-gray-500 leading-relaxed italic text-xs">
              Passwords are hashed using bcrypt (12 rounds) before storage. Username and email must be unique across the system.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm text-xs">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-3">
              User Information
            </h3>
            <p className="text-gray-500 leading-relaxed italic mb-3">
              Group assignment controls RBAC permissions. Timezone determines how dates are displayed.
            </p>
            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
              <div className="flex justify-between text-[10px]">
                <span className="text-gray-400">Group:</span>
                <span className="font-bold text-gray-700 dark:text-gray-300">{groupId ? groups.find((g) => g._id === groupId)?.name || "—" : "None"}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-gray-400">Timezone:</span>
                <span className="font-bold text-gray-700 dark:text-gray-300">{timezone}</span>
            </div>
          </div>

          {/* Biography */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                Biography <span className="text-gray-300 normal-case tracking-normal font-normal">(optional)</span>
              </label>
              <textarea
                value={biography}
                onChange={(e) => setBiography(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-indigo-500 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 resize-none transition-colors"
                placeholder="Brief description about the user"
                rows={3}
              />
            </div>
          </div>

          {/* Status toggle */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">User Status</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Inactive users cannot sign in to the system.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                isActive
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400"
                  : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
              }`}
            >
              {isActive ? "● Active" : "○ Inactive"}
            </button>
          </div>
        </div>
        </div>
      </form>
    </div>
  );
}
