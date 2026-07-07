"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import { FormattedDateTime } from "@/hooks/useTimezone";

interface User {
  _id: string;
  username: string;
  fullName: string;
  email: string;
  emailVerified: boolean;
  groupId: string | null;
  isActive: boolean;
  created: { at: string; by: string | null };
  updated: { at: string; by: string | null };
}

const avatarColors = [
  "bg-indigo-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500",
  "bg-violet-500", "bg-cyan-500", "bg-orange-500", "bg-teal-500",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export default function UsersPage() {

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { document.title = "Users - AccNext"; }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/system/users")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) { setUsers(data); setLoading(false); }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const q = search.toLowerCase();
  const filtered = users.filter(
    (u) =>
      !search ||
      u.username.toLowerCase().includes(q) ||
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
  );

  const resetFilters = () => setSearch("");

  return (
    <div className="max-w-full mx-auto space-y-4 pb-10">
      <PageHeader
        title="Users"
        subtitle="Manage system users and their group assignments"
        actions={
          <Link
            href="/system/users/add"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-xs text-white px-3 py-2 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add User
          </Link>
        }
      />

      {/* Filter bar */}
      <div className="flex flex-col md:flex-row md:items-center gap-2 bg-white dark:bg-gray-900 p-2 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm">
        <div className="relative flex-1">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Search by username, name, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-transparent outline-none text-sm focus:ring-0"
          />
        </div>
        <button
          onClick={resetFilters}
          className="px-4 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all"
        >
          Reset
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-gray-500 font-medium">No users match your criteria.</p>
            <button onClick={resetFilters} className="mt-4 text-indigo-600 font-bold hover:underline">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse text-left">
              <thead className="bg-gray-50/50 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">User</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Username</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Email</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Verified</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                {filtered.map((u) => (
                  <tr key={u._id} className="group hover:bg-indigo-50/40 dark:hover:bg-indigo-500/5 transition-all">
                    {/* Avatar + Name + Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full ${getAvatarColor(u.fullName)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                          {u.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-gray-900 dark:text-white">{u.fullName}</div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <Link
                              href={`/system/users/edit/${u._id}`}
                              className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 text-[10px] font-black uppercase tracking-wider"
                            >
                              Edit
                            </Link>
                            <Link
                              href={`/system/users/${u._id}`}
                              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 text-[10px] font-black uppercase tracking-wider"
                            >
                              Detail
                            </Link>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Username */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-medium text-gray-700 dark:text-gray-300">
                        {u.username}
                      </span>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{u.email}</span>
                    </td>

                    {/* Verified */}
                    <td className="px-4 py-3">
                      {u.emailVerified ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                          </svg>
                          No
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {u.isActive !== false ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400">
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          Inactive
                        </span>
                      )}
                    </td>

                    {/* Created */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500 dark:text-gray-400"><FormattedDateTime date={u.created.at} /></span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
