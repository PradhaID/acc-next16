"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import { FormattedDateTime } from "@/hooks/useTimezone";
import { usePermission } from "@/hooks/useSession";
import { ROLES } from "@/lib/roles";
import { useSelection } from "@/lib/use-selection";
import BulkActionBar from "@/components/ui/BulkActionBar";

interface Group {
  _id: string;
  name: string;
  description?: string;
  created: { at: string; by: string | null };
  updated: { at: string; by: string | null };
}

export default function GroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [filtered, setFiltered] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { document.title = "Groups - Boilerplate"; }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/system/groups")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setGroups(data);
          setFiltered(data);
          setLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const groupIds = filtered.map(g => g._id);
  const selection = useSelection(groupIds);

  async function handleBulkAction(action: string) {
      const ids = Array.from(selection.selected);
      if (action === "delete") {
          if (!confirm(`Delete ${ids.length} groups?`)) return;
      }
      const res = await fetch("/api/system/groups/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: action === "delete" ? "delete" : "status", ids, value: action === "activate" ? "true" : action === "deactivate" ? "false" : undefined }),
      });
      if (res.ok) {
          selection.clear();
          fetch("/api/system/groups")
              .then((r) => r.json())
              .then((data) => { setGroups(data); setFiltered(data); });
      }
  }

  const canAddGroup = usePermission(ROLES.ADD_GROUP);

  const handleSearch = (query: string) => {
    setSearch(query);
    const q = query.toLowerCase();
    setFiltered(
      groups.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.description?.toLowerCase().includes(q)
      )
    );
  };

  return (
    <>
    <div className="max-w-full mx-auto space-y-4 pb-10">
      <PageHeader
        title="Groups"
        subtitle="Manage user groups and their role assignments"
        actions={
          canAddGroup && (
            <Link
              href="/system/groups/add"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:scale-105 active:scale-95 text-xs text-white px-3 py-2 rounded-xl font-bold shadow-md shadow-emerald-500/10 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Group
            </Link>
          )
        }
      />

      {/* Filter bar */}
      <div className="flex flex-col md:flex-row md:items-center gap-2 bg-white dark:bg-stone-900/80 p-2 rounded-2xl border border-gray-200 dark:border-stone-700/50 shadow-sm">
        <div className="relative flex-1">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, description…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-transparent outline-none text-sm focus:ring-0"
          />
        </div>
        <button
          onClick={() => handleSearch("")}
          className="px-4 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all"
        >
          Reset
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 bg-white dark:bg-stone-900/80 border border-gray-200 dark:border-stone-700/50 rounded-xl">
          <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-emerald-500 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center bg-white dark:bg-stone-900/80 border border-gray-200 dark:border-stone-700/50 rounded-xl">
          <svg className="mx-auto h-10 w-10 text-gray-300 dark:text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 11.625l2.25-2.25M12 11.625l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
          <p className="mt-3 text-xs font-bold text-gray-400">No groups found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-stone-700/50 dark:bg-stone-900/80">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80 dark:border-stone-700/50 dark:bg-stone-800/40/40">
                <th className="px-3 py-2 w-10">
                  <input
                    type="checkbox"
                    checked={selection.isAllSelected}
                    onChange={selection.toggleAll}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </th>
                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400">Name</th>
                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400">Description</th>
                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-stone-700/30">
              {filtered.map((g) => (
                <tr
                  key={g._id}
                  onClick={() => router.push(`/system/groups/edit/${g._id}`)}
                  className="transition-colors hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5 cursor-pointer"
                >
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selection.isSelected(g._id)}
                      onChange={() => selection.toggle(g._id)}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-3 py-2 font-bold text-gray-900 dark:text-white">{g.name}</td>
                  <td className="px-3 py-2 font-medium text-gray-500 dark:text-stone-400">{g.description || <span className="italic text-gray-300 dark:text-stone-400">No description</span>}</td>
                  <td className="px-3 py-2 font-medium text-gray-700 dark:text-stone-300"><FormattedDateTime date={g.created.at} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>

            <BulkActionBar
                count={selection.count}
                actions={[
                    { label: "Activate", action: "activate", variant: "primary" },
                    { label: "Deactivate", action: "deactivate", variant: "warning" },
                    { label: "Delete", action: "delete", variant: "danger", confirm: "Are you sure?" },
                ]}
                onAction={handleBulkAction}
                onClear={selection.clear}
            />

        </>
    );
}
