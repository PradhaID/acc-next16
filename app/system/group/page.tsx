"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import SearchInput from "@/components/ui/SearchInput";
import { FormattedDateTime } from "@/hooks/useTimezone";

interface Group {
  _id: string;
  name: string;
  description?: string;
  isActive?: boolean;
  created: { at: string; by: string | null };
  updated: { at: string; by: string | null };
}

export default function GroupListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [groups, setGroups] = useState<Group[]>([]);
  const [filtered, setFiltered] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAlert, setShowAlert] = useState(true);

  const success = searchParams.get("success");

  useEffect(() => {
    document.title = "Groups - AccNext";
  }, []);

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

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setShowAlert(false), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

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
    <div className="max-w-full mx-auto space-y-6 pb-10">
      <PageHeader
        title="Groups"
        subtitle="Manage user groups and their role assignments"
        actions={
          <Link
            href="/system/group/add"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-xs text-white px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Group
          </Link>
        }
      />

      {showAlert && success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/50 text-green-700 dark:text-green-300 rounded-2xl text-xs font-bold flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          {success === "created" && "Group successfully created"}
          {success === "updated" && "Group successfully updated"}
        </div>
      )}

      <SearchInput value={search} onChange={handleSearch} placeholder="Search groups..." />

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-gray-800">
          {loading ? (
            <div className="col-span-full py-20 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="col-span-full py-16 text-center">
              <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
              <p className="text-sm text-gray-500 font-medium">No groups found</p>
              {search && (
                <button onClick={() => setSearch("")} className="mt-2 text-xs text-indigo-600 hover:text-indigo-700 font-bold">
                  Clear search
                </button>
              )}
            </div>
          ) : (
            filtered.map((group) => (
              <div key={group._id} className="p-5 flex flex-col justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                    {group.name}
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                      group.isActive !== false
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400"
                        : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
                    }`}>
                      {group.isActive !== false ? "Active" : "Disabled"}
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-4">
                    {group.description || <span className="italic">No description</span>}
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.087 4.113" />
                    </svg>
                    <span>Created <FormattedDateTime date={group.created.at} /></span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/system/group/role/${group._id}`)}
                      className="flex-1 text-center py-2 bg-gray-100 dark:bg-gray-800 hover:bg-indigo-600 hover:text-white rounded-xl text-[11px] font-black uppercase tracking-tight transition-all"
                    >
                      Manage Roles
                    </button>
                    <button
                      onClick={() => router.push(`/system/group/edit/${group._id}`)}
                      className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all text-gray-500 dark:text-gray-400"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
