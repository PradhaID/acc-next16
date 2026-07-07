"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import FormField from "@/components/ui/FormField";

export default function EditGroupPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<{ _id: string; name: string; description?: string; isActive?: boolean } | null>(null);

  useEffect(() => {
    document.title = "Edit Group - AccNext";
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/system/groups?id=${id}`);
        if (cancelled) return;
        const data = await res.json();
        setGroup(data);
        setName(data.name || "");
        setDescription(data.description || "");
        setIsActive(data.isActive !== false);
        setLoading(false);
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
      const res = await fetch("/api/system/groups", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: id, name, description, isActive }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update group.");
      }
      router.push("/system/group?success=updated");
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

  return (
    <div className="max-w-full mx-auto space-y-6 pb-10">
      <PageHeader
        title="Edit Group"
        subtitle={
          group ? (
            <>
              Editing: <span className="font-bold text-indigo-600">{group.name}</span>
            </>
          ) : undefined
        }
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/system/group/role/${id}`}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/50 text-xs px-4 py-2 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
            >
              <svg className="w-4 h-4 inline mr-1.5 -mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
              Manage Roles
            </Link>
            <Link
              href="/system/group"
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/50 text-xs px-4 py-2 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
            >
              Cancel
            </Link>
            <button
              type="submit"
              form="group-edit-form"
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

      <form id="group-edit-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left column — form */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm">
            {error && (
              <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold">
                {error}
              </div>
            )}

            <div className="space-y-5">
              <FormField label="Group Name" required>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-indigo-500 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 transition-colors"
                  required
                />
              </FormField>

              <FormField label="Description">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-indigo-500 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 resize-none transition-colors"
                  rows={4}
                />
              </FormField>

              {/* Status toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50">
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Group Status</p>
                  <p className="text-xs text-gray-500 mt-0.5">If disabled, users in this group cannot access the application.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400"
                      : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
                  }`}
                >
                  {isActive ? "\u25CF Active" : "\u25CB Disabled"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right column — info cards */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-3">
              Group Details
            </h3>
            <div className="space-y-3 text-[11px]">
              <div className="flex justify-between py-1.5 px-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <span className="text-gray-400 font-bold">ID</span>
                <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{group?._id.slice(-8)}</span>
              </div>
              <div className="flex justify-between py-1.5 px-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <span className="text-gray-400 font-bold">Name</span>
                <span className="font-bold text-gray-700 dark:text-gray-300 truncate ml-2">{group?.name}</span>
              </div>
              {group?.description && (
                <div className="flex justify-between py-1.5 px-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <span className="text-gray-400 font-bold">Description</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300 truncate ml-2 max-w-[120px]">{group.description}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm text-xs">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-3">
              Role Management
            </h3>
            <p className="text-gray-500 leading-relaxed italic">
              Use the &ldquo;Manage Roles&rdquo; button to assign or modify the role-based access permissions for this group.
            </p>
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <Link
                href={`/system/group/role/${id}`}
                className="flex items-center justify-center gap-1.5 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75c0 1.24 1.01 2.25 2.25 2.25Z" />
                </svg>
                Go to Roles
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
