"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import { FormattedDateTime } from "@/hooks/useTimezone";
import { usePermission } from "@/hooks/useSession";
import { ROLES } from "@/lib/roles";
import { useSelection } from "@/lib/use-selection";
import BulkActionBar from "@/components/ui/BulkActionBar";
import { useT } from "@/components/LanguageProvider";

interface User {
  _id: string;
  username: string;
  fullName: string;
  email: string;
  image?: string | null;
  emailVerified: boolean;
  groupId: string | null;
  groupName: string | null;
  isActive: boolean;
  created: { at: string; by: string | null };
  updated: { at: string; by: string | null };
}

const avatarColors = [
  "bg-emerald-500", "bg-emerald-500", "bg-emerald-500", "bg-emerald-500",
  "bg-violet-500", "bg-cyan-500", "bg-emerald-500", "bg-teal-500",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export default function UsersPage() {

  const t = useT();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { document.title = "Users - Boilerplate"; }, []);

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
      (u.fullName || "").toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
  );

  const userIds = filtered.map(u => u._id);
  const selection = useSelection(userIds);

  async function handleBulkAction(action: string) {
      const ids = Array.from(selection.selected);
      if (action === "delete") {
          if (!confirm(`Delete ${ids.length} users?`)) return;
      }
      const res = await fetch("/api/system/users/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: action === "delete" ? "delete" : "status", ids, value: action === "activate" ? "true" : action === "deactivate" ? "false" : undefined }),
      });
      if (res.ok) {
          selection.clear();
          fetch("/api/system/users")
              .then((r) => r.json())
              .then((data) => setUsers(data));
      }
  }

  const canAddUser = usePermission(ROLES.ADD_USER);
  const canEditUser = usePermission(ROLES.EDIT_USER);
  const canViewDetails = usePermission(ROLES.USER_DETAIL);

  const resetFilters = () => setSearch("");

  return (
    <>
    <div className="max-w-full mx-auto space-y-4 pb-10">
      <PageHeader
        title={t("users.title")}
        subtitle={t("users.subtitle")}
        actions={
          canAddUser && (
            <Link
              href="/system/users/add"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:scale-105 active:scale-95 text-xs text-white px-3 py-2 rounded-xl font-bold shadow-md shadow-emerald-500/10 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {t("users.add")}
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
            placeholder={t("users.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-transparent outline-none text-sm focus:ring-0"
          />
        </div>
        <button
          onClick={resetFilters}
          className="px-4 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all"
        >
          {t("users.reset")}
        </button>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-stone-900/80 border border-gray-200 dark:border-stone-700/50 rounded-2xl shadow-sm">
          <p className="text-gray-500 font-medium">{t("users.noResults")}</p>
          <button onClick={resetFilters} className="mt-4 text-emerald-600 font-bold hover:underline">
            {t("users.clearFilters")}
          </button>
        </div>
      ) : (
        <>
          {/* Mobile: Single card list */}
          <div className="md:hidden bg-white dark:bg-stone-900/80 border border-gray-200 dark:border-stone-700/50 rounded-2xl shadow-sm divide-y divide-gray-100 dark:divide-stone-700/30">
            {filtered.map((u) => (
              <div key={u._id} className="p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selection.isSelected(u._id)}
                    onChange={() => selection.toggle(u._id)}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer mt-1 shrink-0"
                  />
                  {u.image ? (
                    <img src={u.image} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className={`w-10 h-10 rounded-full ${getAvatarColor(u.fullName || u.username)} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                      {(u.fullName || u.username || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                        {u.fullName || u.username}
                      </p>
                      {u.isActive !== false ? (
                        <span className="shrink-0 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {t("users.active")}
                        </span>
                      ) : (
                        <span className="shrink-0 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {t("users.inactive")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-stone-400 truncate mt-0.5">@{u.username}</p>
                    <p className="text-xs text-gray-400 dark:text-stone-500 truncate mt-0.5">{u.email}</p>
                    {u.groupName && (
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold truncate mt-0.5">{u.groupName}</p>
                    )}

                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-gray-400">
                        <FormattedDateTime date={u.created.at} />
                      </span>
                      <div className="flex items-center gap-2 ml-auto">
                        {canEditUser && (
                            <Link
                              href={`/system/users/edit/${u._id}`}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                            >
                              {t("actions.edit")}
                            </Link>
                          )}
                          {canViewDetails && (
                            <Link
                              href={`/system/users/${u._id}`}
                              className="px-2.5 py-1 bg-gray-50 hover:bg-gray-100 dark:bg-stone-800/40 text-gray-500 dark:text-stone-400 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                            >
                              {t("users.detail")}
                            </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: Table */}
          <div className="hidden md:block bg-white dark:bg-stone-900/80 border border-gray-200 dark:border-stone-700/50 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full table-auto border-collapse text-left">
                <thead className="bg-gray-50/50 dark:bg-stone-800/40 border-b border-gray-100 dark:border-stone-700/50">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={selection.isAllSelected}
                        onChange={selection.toggleAll}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">{t("content.article")}</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">{t("users.username")}</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">{t("users.email")}</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">{t("users.group")}</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">{t("profile.emailVerified")}</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">{t("profile.status")}</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">{t("logs.created")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-stone-700/30">
                  {filtered.map((u) => (
                    <tr key={u._id} className="group hover:bg-emerald-50/20 dark:hover:bg-emerald-500/5 transition-all">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selection.isSelected(u._id)}
                          onChange={() => selection.toggle(u._id)}
                          className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {u.image ? (
                            <img src={u.image} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className={`w-8 h-8 rounded-full ${getAvatarColor(u.fullName || u.username)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                              {(u.fullName || u.username || "?").charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-sm text-gray-900 dark:text-white">{u.fullName || u.username}</div>
                            <div className="flex items-center gap-3 mt-0.5">
                              {canEditUser && (
                                <Link
                                  href={`/system/users/edit/${u._id}`}
                                  className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 text-[10px] font-black uppercase tracking-wider"
                                >
                                  {t("actions.edit")}
                                </Link>
                              )}
                              {canViewDetails && (
                                <Link
                                  href={`/system/users/${u._id}`}
                                  className="text-gray-400 hover:text-gray-600 dark:text-stone-500 dark:hover:text-gray-300 text-[10px] font-black uppercase tracking-wider"
                                >
                                  {t("users.detail")}
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-medium text-gray-700 dark:text-stone-300">
                          {u.username}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600 dark:text-stone-400">{u.email}</span>
                      </td>
                      <td className="px-4 py-3">
                        {u.groupName ? (
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{u.groupName}</span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {u.emailVerified ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                               <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                             </svg>
                            {t("users.yes")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                               <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                             </svg>
                            {t("users.no")}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                          {u.isActive !== false ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              {t("users.active")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              {t("users.inactive")}
                            </span>
                          )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-500 dark:text-stone-400"><FormattedDateTime date={u.created.at} /></span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Count */}
          <p className="text-xs text-gray-400 font-bold px-1">
            {filtered.length} {t("users.count")}{filtered.length !== 1 ? "s" : ""}
          </p>
        </>
      )}
    </div>

            <BulkActionBar
                count={selection.count}
                actions={[
                    { label: t("actions.activate"), action: "activate", variant: "primary" },
                    { label: t("actions.deactivate"), action: "deactivate", variant: "warning" },
                    { label: t("actions.delete"), action: "delete", variant: "danger", confirm: t("common.areYouSure") },
                ]}
                onAction={handleBulkAction}
                onClear={selection.clear}
            />

        </>
    );
}
