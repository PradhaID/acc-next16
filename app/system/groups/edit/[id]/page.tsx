"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import FormField from "@/components/ui/FormField";
import DataTable from "@/components/ui/DataTable";
import type { Column } from "@/components/ui/DataTable";

interface Role {
  _id: string;
  name: string;
  description?: string;
  url?: string;
  parent?: string | null;
}

export default function EditGroupPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "Edit Group - AccNext"; }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/system/groups?id=${id}&withRoles=true`);
        if (cancelled) return;
        const group = await res.json();
        setName(group.name || "");
        setDescription(group.description || "");
        if (group.roles) setRoles(group.roles);
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
        body: JSON.stringify({ _id: id, name, description }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update group.");
      }

      router.push("/system/groups");
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

  const roleColumns: Column<Role>[] = [
    { key: "name", label: "Role" },
    { key: "description", label: "Description" },
    { key: "url", label: "URL", render: (row) => row.url || "-" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <PageHeader
        title="Edit Group"
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
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  Update Group
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

      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm">
        <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 ml-1">
          Assigned Roles
        </h2>
        <DataTable
          columns={roleColumns}
          data={roles}
          keyExtractor={(row) => row._id}
          loading={false}
        />
      </div>
    </div>
  );
}
