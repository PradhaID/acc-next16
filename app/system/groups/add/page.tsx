"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import FormField from "@/components/ui/FormField";

export default function AddGroupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { document.title = "Add Group - AccNext"; }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const res = await fetch("/api/system/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create group.");
      }

      router.push("/system/groups");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <PageHeader
        title="Add Group"
        actions={
          <Link
            href="/system/groups"
            className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/50 text-xs px-4 py-2 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back
          </Link>
        }
      />

      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <FormField label="Name" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-indigo-500 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 transition-colors"
              placeholder="Enter group name"
              required
            />
          </FormField>

          <FormField label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-indigo-500 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 resize-none transition-colors"
              placeholder="Enter description"
              rows={3}
            />
          </FormField>

          <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Create Group
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => router.push("/system/groups")}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/50 text-xs px-4 py-2 rounded-xl font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
