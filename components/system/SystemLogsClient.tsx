"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { useT } from "@/components/LanguageProvider";

interface LogRow {
  _id: string;
  time: string;
  level: string;
  category: string;
  action: string;
  target: string;
  username: string;
  detail: string;
  oldValue: string | null;
  newValue: string | null;
  ip: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Stats {
  total: number;
  byCategory: Record<string, number>;
  byLevel: Record<string, number>;
}

const CATEGORIES = ["AUTH", "USER", "GROUP", "ROLE", "CONTENT", "REDIRECT", "SETTINGS", "PROFILE", "API_KEY", "SYSTEM", "AD"];
const LEVELS = ["INFO", "WARN", "ERROR"];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  AUTH: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400" },
  USER: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400" },
  GROUP: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400" },
  ROLE: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-400" },
  CONTENT: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400" },
  REDIRECT: { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200 dark:bg-cyan-900/20 dark:border-cyan-800 dark:text-cyan-400" },
  SETTINGS: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400" },
  PROFILE: { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200 dark:bg-pink-900/20 dark:border-pink-800 dark:text-pink-400" },
  API_KEY: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200 dark:bg-orange-950/30 dark:border-orange-800 dark:text-orange-400" },
  SYSTEM: { bg: "bg-stone-50", text: "text-stone-700", border: "border-stone-200 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300" },
  AD: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200 dark:bg-teal-900/20 dark:border-teal-800 dark:text-teal-400" },
};

export default function SystemLogsClient() {
  const t = useT();
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 50, totalPages: 1 });
  const [stats, setStats] = useState<Stats | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("");
  const [category, setCategory] = useState("");
  const [user, setUser] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (level) params.set("level", level);
    if (category) params.set("category", category);
    if (user) params.set("user", user);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("page", String(page));
    params.set("limit", "50");

    try {
      const res = await fetch(`/api/system/logs?${params}`);
      if (res.ok) {
        const json = await res.json();
        setLogs(json.data);
        setPagination(json.pagination);
        setStats(json.stats);
      }
    } catch {}
    setLoading(false);
  }, [search, level, category, user, from, to, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExport = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (level) params.set("level", level);
    if (category) params.set("category", category);
    if (user) params.set("user", user);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("export", "csv");
    window.open(`/api/system/logs?${params}`, "_blank");
  };

  const handleReset = () => {
    setSearch("");
    setLevel("");
    setCategory("");
    setUser("");
    setFrom("");
    setTo("");
    setPage(1);
  };

  const hasFilters = search || level || category || user || from || to;

  const formatTime = (t: string) =>
    new Date(t).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const formatTimeShort = (t: string) =>
    new Date(t).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  const levelBadge = (lvl: string) => (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
      lvl === "ERROR"
        ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400"
        : lvl === "WARN"
          ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400"
          : "bg-stone-50 text-stone-700 border-stone-200 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300"
    }`}>
      {lvl}
    </span>
  );

  const categoryBadge = (cat: string) => {
    const c = CATEGORY_COLORS[cat] || CATEGORY_COLORS.SYSTEM;
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${c.bg} ${c.text} ${c.border}`}>
        {cat}
      </span>
    );
  };

  const formatJson = (json: string | null) => {
    if (!json) return null;
    try {
      const obj = JSON.parse(json);
      return (
        <div className="bg-gray-50 dark:bg-stone-800/40 rounded-lg p-2 text-[10px] font-mono space-y-0.5">
          {Object.entries(obj).map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <span className="text-gray-500 dark:text-stone-400 shrink-0">{k}:</span>
              <span className="text-gray-700 dark:text-stone-300 break-all">{String(v ?? "—")}</span>
            </div>
          ))}
        </div>
      );
    } catch {
      return <span className="text-[10px] font-mono text-gray-500">{json}</span>;
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-4">
      {/* Stats cards */}
      {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-stone-900/80 border border-gray-200 dark:border-stone-700/50 rounded-2xl p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{t("logs.totalLogs")}</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.total.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-stone-900/80 border border-gray-200 dark:border-stone-700/50 rounded-2xl p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{t("logs.byLevel")}</p>
              <div className="flex gap-2 mt-1">
                {LEVELS.map((l) => (
                  <span key={l} className="text-xs font-bold">
                    <span className={l === "ERROR" ? "text-red-600" : l === "WARN" ? "text-amber-600" : "text-stone-600"}>{stats.byLevel[l] || 0}</span>
                    <span className="text-gray-400 ml-0.5">{l.charAt(0)}</span>
                  </span>
                ))}
              </div>
            </div>
            <div className="bg-white dark:bg-stone-900/80 border border-gray-200 dark:border-stone-700/50 rounded-2xl p-4 shadow-sm col-span-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{t("logs.topCategories")}</p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {Object.entries(stats.byCategory)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([cat, count]) => (
                  <button
                    key={cat}
                    onClick={() => { setCategory(category === cat ? "" : cat); setPage(1); }}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all ${
                      category === cat
                        ? "bg-orange-100 border-orange-300 text-orange-700 dark:bg-orange-950/30 dark:border-orange-700 dark:text-orange-400"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 dark:bg-stone-800/40 dark:border-stone-700/50 dark:text-stone-400"
                    }`}
                  >
                    {cat}
                    <span className="text-gray-400">{count}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-white dark:bg-stone-900/80 p-2 rounded-2xl border border-gray-200 dark:border-stone-700/50 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <div className="relative flex-1">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); fetchLogs(); } }}
              placeholder={t("logs.searchPlaceholder") || "Search action, detail, user, or target..."}
              className="w-full pl-9 pr-4 py-2 bg-transparent outline-none text-sm focus:ring-0"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-200 dark:border-stone-700/50 bg-transparent px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-stone-300 focus:border-orange-500 focus:outline-none"
            >
              <option value="">{t("logs.allCategories")}</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            <select
              value={level}
              onChange={(e) => { setLevel(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-200 dark:border-stone-700/50 bg-transparent px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-stone-300 focus:border-orange-500 focus:outline-none"
            >
              <option value="">{t("logs.allLevels")}</option>
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>

            <input
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); fetchLogs(); } }}
              placeholder={t("logs.user") + "..."}
              className="rounded-lg border border-gray-200 dark:border-stone-700/50 bg-transparent px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-stone-300 placeholder:text-gray-400 focus:border-orange-500 focus:outline-none w-24 md:w-28"
            />

            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-gray-200 dark:border-stone-700/50 bg-transparent px-2 py-1.5 text-xs font-bold text-gray-700 dark:text-stone-300 focus:border-orange-500 focus:outline-none"
            />

            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-gray-200 dark:border-stone-700/50 bg-transparent px-2 py-1.5 text-xs font-bold text-gray-700 dark:text-stone-300 focus:border-orange-500 focus:outline-none"
            />

            <button
              onClick={() => { setPage(1); fetchLogs(); }}
              className="px-4 py-1.5 bg-orange-50 hover:bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all"
            >
              {t("logs.filter")}
            </button>

            {hasFilters && (
              <button
                onClick={handleReset}
                className="px-4 py-1.5 bg-orange-50 hover:bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all"
              >
                {t("logs.reset")}
              </button>
            )}

            <button
              onClick={handleExport}
              className="px-4 py-1.5 bg-orange-50 hover:bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all inline-flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              {t("logs.export")}
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="py-20 text-center bg-white dark:bg-stone-900/80 border border-gray-200 dark:border-stone-700/50 rounded-2xl shadow-sm">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : logs.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-stone-900/80 border border-gray-200 dark:border-stone-700/50 rounded-2xl shadow-sm">
           <p className="text-gray-500 font-medium">{t("logs.noResults")}</p>
          <button onClick={handleReset} className="mt-4 text-orange-600 font-bold hover:underline">
            {t("logs.clearFilters")}
          </button>
        </div>
      ) : (
        <>
          {/* Mobile: Card list */}
          <div className="md:hidden bg-white dark:bg-stone-900/80 border border-gray-200 dark:border-stone-700/50 rounded-2xl shadow-sm divide-y divide-gray-100 dark:divide-stone-700/30">
            {logs.map((log) => (
              <div key={log._id}>
                <button
                  onClick={() => toggleExpand(log._id)}
                  className="w-full p-4 text-left hover:bg-orange-50/20 transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      {levelBadge(log.level)}
                      {categoryBadge(log.category)}
                    </div>
                    <span className="text-[10px] font-mono text-gray-400 shrink-0">{formatTimeShort(log.time)}</span>
                  </div>
                  <p className="font-bold text-sm text-gray-900 dark:text-white">{log.action}</p>
                  <p className="text-xs text-gray-500 dark:text-stone-400 mt-0.5">@{log.username}</p>
                  {log.detail && log.detail !== "-" && (
                    <p className="text-xs text-gray-400 dark:text-stone-500 mt-1 line-clamp-2">{log.detail}</p>
                  )}
                  {(log.oldValue || log.newValue) && (
                    <span className="text-[10px] text-orange-500 font-bold mt-1 inline-block">
                       {expandedId === log._id ? t("logs.less") : t("logs.changes")}
                    </span>
                  )}
                </button>

                {expandedId === log._id && (
                  <div className="px-4 pb-4 space-y-2 border-t border-gray-100 dark:border-stone-700/50 pt-2">
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div><span className="text-gray-400 font-bold">Time:</span> <span className="text-gray-600 dark:text-stone-300 font-mono">{formatTime(log.time)}</span></div>
                      <div><span className="text-gray-400 font-bold">IP:</span> <span className="text-gray-600 dark:text-stone-300 font-mono">{log.ip}</span></div>
                      <div className="col-span-2"><span className="text-gray-400 font-bold">Target:</span> <span className="text-gray-600 dark:text-stone-300">{log.target}</span></div>
                    </div>
                    {log.oldValue && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{t("logs.before")}</p>
                        {formatJson(log.oldValue)}
                      </div>
                    )}
                    {log.newValue && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{t("logs.after")}</p>
                        {formatJson(log.newValue)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop: Table */}
          <div className="hidden md:block bg-white dark:bg-stone-900/80 border border-gray-200 dark:border-stone-700/50 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full table-auto border-collapse text-left">
                <thead className="bg-gray-50/50 dark:bg-stone-800/40 border-b border-gray-100 dark:border-stone-700/50">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 w-8"></th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">{t("logs.time")}</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">{t("logs.level")}</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">{t("logs.category")}</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">{t("logs.action")}</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">{t("logs.user")}</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">{t("logs.target")}</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">{t("logs.detail")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-stone-700/30">
                  {logs.map((log) => {
                    const hasChanges = !!(log.oldValue || log.newValue);
                    return (
                      <Fragment key={log._id}>
                        <tr
                          onClick={() => hasChanges && toggleExpand(log._id)}
                          className={`transition-all ${hasChanges ? "cursor-pointer hover:bg-orange-50/20 dark:hover:bg-orange-500/5" : ""}`}
                        >
                          <td className="px-4 py-3">
                            {hasChanges && (
                              <svg className={`w-3 h-3 text-gray-400 transition-transform ${expandedId === log._id ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                              </svg>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{formatTimeShort(log.time)}</td>
                          <td className="px-4 py-3">{levelBadge(log.level)}</td>
                          <td className="px-4 py-3">{categoryBadge(log.category)}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{log.action}</td>
                          <td className="px-4 py-3 text-xs text-gray-600 dark:text-stone-400">{log.username}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{log.target}</td>
                          <td className="px-4 py-3 text-xs text-gray-400 max-w-xs truncate">{log.detail}</td>
                        </tr>
                        {expandedId === log._id && hasChanges && (
                          <tr>
                            <td colSpan={8} className="px-4 py-3 bg-gray-50/50 dark:bg-stone-800/40">
                              <div className="grid grid-cols-3 gap-4 text-[10px]">
                                <div>
                                  <span className="text-gray-400 font-bold">Time:</span>
                                  <span className="text-gray-600 dark:text-stone-300 font-mono ml-1">{formatTime(log.time)}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400 font-bold">IP:</span>
                                  <span className="text-gray-600 dark:text-stone-300 font-mono ml-1">{log.ip}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400 font-bold">Target:</span>
                                  <span className="text-gray-600 dark:text-stone-300 ml-1">{log.target}</span>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4 mt-2">
                                {log.oldValue && (
                                  <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{t("logs.before")}</p>
                                    {formatJson(log.oldValue)}
                                  </div>
                                )}
                                {log.newValue && (
                                  <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{t("logs.after")}</p>
                                    {formatJson(log.newValue)}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400 font-bold">
                {t("logs.page")} {pagination.page} of {pagination.totalPages} &middot; {pagination.total} {t("logs.totalLogs")}{pagination.total !== 1 ? "s" : ""}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-stone-700/50 bg-white dark:bg-stone-800/40 px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-stone-400 transition-all hover:bg-gray-50 dark:hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                   <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                   </svg>
                   {t("logs.prev")}
                 </button>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-stone-700/50 bg-white dark:bg-stone-800/40 px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-stone-400 transition-all hover:bg-gray-50 dark:hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t("logs.next")}
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
