"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import FormField from "@/components/ui/FormField";

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [groups, setGroups] = useState<{ _id: string; name: string }[]>([]);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [groupId, setGroupId] = useState("");
  const [biography, setBiography] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "Edit User - AccNext"; }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [userRes, groupsRes] = await Promise.all([
          fetch(`/api/system/users?id=${id}`),
          fetch("/api/system/groups"),
        ]);
        if (!cancelled) {
          const user = await userRes.json();
          setUsername(user.username || "");
          setFullName(user.fullName || "");
          setEmail(user.email || "");
          setGroupId(user.groupId || "");
          setBiography(user.biography || "");
          setIsActive(user.isActive !== false);
          const gs = await groupsRes.json();
          setGroups(gs);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const body: Record<string, unknown> = { _id: id, fullName, email, groupId: groupId || null, biography, isActive };
      if (password) body.password = password;

      const res = await fetch("/api/system/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update user.");
      }

      router.push(`/system/users/${id}?updated=true`);
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
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  const selectedGroup = groups.find((g) => g._id === groupId);

  return (
    <div className="max-w-full mx-auto space-y-6 pb-10">
      <PageHeader
        title="Edit User"
        subtitle={
          <>
            Editing: <span className="font-bold text-indigo-600">{fullName}</span>
          </>
        }
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
              form="user-edit-form"
              disabled={saving}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        }
      />

      <form id="user-edit-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left column — form */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm">
            {error && (
              <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Username (read-only) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                  Username
                </label>
                <div className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800/50 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 font-mono">
                  {username}
                </div>
              </div>

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

              <FormField label="New Password (leave blank to keep current)">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-indigo-500 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 transition-colors"
                  placeholder="Enter new password"
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

        {/* Right column — info cards */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-3">
              User Details
            </h3>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-gray-400">Username</dt>
                <dd className="font-bold text-gray-700 dark:text-gray-300 font-mono">{username}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Group</dt>
                <dd className="font-bold text-gray-700 dark:text-gray-300">{selectedGroup?.name || "None"}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm text-xs">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-3">
              Quick Links
            </h3>
            <div className="space-y-2">
              <Link
                href={`/system/users/${id}`}
                className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
                View Detail
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
