"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import FormField from "@/components/ui/FormField";
import Toggle from "@/components/ui/Toggle";

export default function AddGroupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = `Add Group - ${process.env.NEXT_PUBLIC_APP_NAME || "Boilerplate"}`;
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/system/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, isActive }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create group.");
      }
      router.push("/system/group?success=created");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-full mx-auto space-y-6 pb-10">
      <PageHeader
        title="Add Group"
        subtitle="Create a new user group"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/system/group"
              className="btn-secondary"
            >
              Cancel
            </Link>
            <button
              type="submit"
              form="group-form"
              disabled={saving}
              className="btn-primary"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              {saving ? "Saving..." : "Create Group"}
            </button>
          </div>
        }
      />

      <form id="group-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left column — form */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white dark:bg-stone-900/80 p-6 rounded-2xl border border-gray-200 dark:border-stone-700/50 shadow-sm">
            {error && (
              <div className="mb-6 p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/50 text-orange-600 dark:text-orange-400 rounded-xl text-xs font-bold">
                {error}
              </div>
            )}

            <div className="space-y-5">
              <FormField label="Group Name" required>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-stone-800/40 border border-transparent focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 transition-colors"
                  placeholder="e.g. Billing Team"
                  required
                />
              </FormField>

              <FormField label="Description">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-stone-800/40 border border-transparent focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 resize-none transition-colors"
                  placeholder="Describe this group\u2019s purpose"
                  rows={4}
                />
              </FormField>

              {/* Status toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-stone-800/40 rounded-xl border border-gray-100 dark:border-stone-700/50">
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Group Status</p>
                  <p className="text-xs text-gray-500 mt-0.5">If disabled, users in this group cannot access the application.</p>
                </div>
                <Toggle
                  id="group-status-toggle"
                  checked={isActive}
                  onChange={() => setIsActive(!isActive)}
                  label={isActive ? "Active" : "Disabled"}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right column — info cards */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-stone-900/80 p-4 rounded-2xl border border-gray-200 dark:border-stone-700/50 shadow-sm">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-655 mb-3">
              About Groups
            </h3>
            <p className="text-gray-500 leading-relaxed text-xs">
              Groups define a collection of users who share the same role-based access permissions.
            </p>
            <ul className="mt-3 space-y-2 text-[11px] text-gray-500">
              <li className="flex gap-2">
                <span className="text-orange-600 font-bold shrink-0">1.</span>
                <span>Create a group with a descriptive name.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-600 font-bold shrink-0">2.</span>
                <span>Assign roles to the group after creation.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-600 font-bold shrink-0">3.</span>
                <span>Users inherit all roles assigned to their group.</span>
              </li>
            </ul>
          </div>

          <div className="bg-white dark:bg-stone-900/80 p-4 rounded-2xl border border-gray-200 dark:border-stone-700/50 shadow-sm text-xs">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-655 mb-3">
              Next Steps
            </h3>
            <p className="text-gray-500 leading-relaxed italic">
              After creating the group, you will be able to manage its role-based access permissions through the Group Roles page.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
