"use client";

import { useState, useEffect, useCallback } from "react";
import { useT } from "@/components/LanguageProvider";

interface RedirectDoc {
  _id: string;
  from: string;
  to: string;
  type: "301" | "302" | "308";
  isPattern: boolean;
  isActive: boolean;
  hitCount: number;
  created: { at: string };
}

interface RedirectLogDoc {
  _id: string;
  url: string;
  referrer?: string;
  userAgent?: string;
  totalHits: number;
  created: { at: string };
}

type Tab = "redirects" | "log";

export default function RedirectManager() {
  const t = useT();
  const [tab, setTab] = useState<Tab>("redirects");
  const [redirects, setRedirects] = useState<RedirectDoc[]>([]);
  const [logs, setLogs] = useState<RedirectLogDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ from: "", to: "", type: "301" as "301" | "302" | "308", isPattern: false });
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "redirects") {
        const res = await fetch("/api/system/redirects");
        if (res.ok) setRedirects(await res.json());
      } else {
        const res = await fetch("/api/system/redirects?type=log");
        if (res.ok) setLogs(await res.json());
      }
    } catch {
      setError("Failed to load data");
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setForm({ from: "", to: "", type: "301", isPattern: false });
    setEditingId(null);
    setShowForm(false);
    setError("");
  };

  const handleSubmit = async () => {
    setError("");
    if (!form.from || !form.to) {
      setError("From and To are required.");
      return;
    }

    try {
      if (editingId) {
        const res = await fetch("/api/system/redirects/[id]", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ _id: editingId, ...form }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to update");
          return;
        }
      } else {
        const res = await fetch("/api/system/redirects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to create");
          return;
        }
      }
      resetForm();
      fetchData();
    } catch {
      setError("Request failed");
    }
  };

  const handleEdit = (item: RedirectDoc) => {
    setForm({ from: item.from, to: item.to, type: item.type, isPattern: item.isPattern });
    setEditingId(item._id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this redirect rule?")) return;
    try {
      await fetch(`/api/system/redirects/${id}`, { method: "DELETE" });
      fetchData();
    } catch {
      // silent
    }
  };

  const handleToggle = async (item: RedirectDoc) => {
    try {
      await fetch("/api/system/redirects/[id]", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: item._id, isActive: !item.isActive }),
      });
      fetchData();
    } catch {
      // silent
    }
  };

  const handleCreateFromLog = (url: string) => {
    setForm({ from: url, to: "/", type: "301", isPattern: false });
    setEditingId(null);
    setShowForm(true);
    setTab("redirects");
  };

  const handleDeleteLog = async (id: string) => {
    if (!confirm("Delete this 404 log entry?")) return;
    try {
      await fetch(`/api/system/redirects?type=log&id=${id}`, { method: "DELETE" });
      setLogs((prev) => prev.filter((l) => l._id !== id));
    } catch {
      // silent
    }
  };

  return (
    <div className="space-y-4">
      {/* Tabs + Actions */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-stone-700/50">
        <div className="flex gap-1">
          <button
            onClick={() => setTab("redirects")}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
              tab === "redirects"
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {t("redirects.activeRedirects")}
          </button>
          <button
            onClick={() => setTab("log")}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
              tab === "log"
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {t("redirects.log404")}
          </button>
        </div>
        {tab === "redirects" && !showForm && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 font-bold">{redirects.length} {t("redirects.ruleCount")}{redirects.length !== 1 ? "s" : ""}</span>
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-3.5 py-2 text-[11px] font-bold text-white shadow-md shadow-orange-500/10 transition-all hover:scale-105 active:scale-95"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {t("redirects.addRule")}
            </button>
          </div>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-2xl border border-gray-200 dark:border-stone-700/50 bg-white dark:bg-stone-900/80 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">
                {editingId ? t("redirects.editRule") : t("redirects.newRule")}
              </h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-gray-400">{t("redirects.fromUrl")}</label>
                <input
                  value={form.from}
                  onChange={(e) => setForm({ ...form, from: e.target.value })}
                  placeholder="/old-page"
                  className="w-full rounded-xl border border-gray-200 dark:border-stone-700/50 bg-gray-50 dark:bg-stone-800/40 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-gray-400">{t("redirects.toUrl")}</label>
                <input
                  value={form.to}
                  onChange={(e) => setForm({ ...form, to: e.target.value })}
                  placeholder="/new-page"
                  className="w-full rounded-xl border border-gray-200 dark:border-stone-700/50 bg-gray-50 dark:bg-stone-800/40 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-gray-400">{t("redirects.type")}</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as "301" | "302" | "308" })}
                  className="rounded-xl border border-gray-200 dark:border-stone-700/50 bg-gray-50 dark:bg-stone-800/40 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-orange-500 focus:outline-none"
                >
                  <option value="301">301 — Permanent</option>
                  <option value="302">302 — Temporary</option>
                  <option value="308">308 — Permanent (Strict)</option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="isPattern"
                  checked={form.isPattern}
                  onChange={(e) => setForm({ ...form, isPattern: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                />
                <label htmlFor="isPattern" className="text-xs text-gray-600 dark:text-stone-400">
                  {t("redirects.patternMode")}
                </label>
              </div>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex justify-end gap-2">
              <button
                onClick={resetForm}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-stone-700/50 bg-white dark:bg-stone-800/40 text-xs font-bold text-gray-600 dark:text-stone-400 transition-all hover:bg-gray-50 dark:hover:bg-stone-700"
              >
                {t("redirects.cancel")}
              </button>
              <button
                onClick={handleSubmit}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-[11px] font-bold text-white shadow-md shadow-orange-500/10 transition-all hover:scale-105 active:scale-95"
              >
                {editingId ? t("redirects.updateRule") : t("redirects.createRule")}
              </button>
            </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : tab === "redirects" ? (
          redirects.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-gray-500 font-medium">{t("redirects.noRules")}</p>
            </div>
        ) : (
          <>
            {/* Mobile: Single card list */}
            <div className="md:hidden bg-white dark:bg-stone-900/80 border border-gray-200 dark:border-stone-700/50 rounded-2xl shadow-sm divide-y divide-gray-100 dark:divide-stone-700/30">
              {redirects.map((item) => (
                <div key={item._id} className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border bg-gray-50 dark:bg-stone-800/40 text-gray-700 dark:text-stone-300 border-gray-200 dark:border-stone-700/50">
                      {item.type}
                    </span>
                    <button
                      onClick={() => handleToggle(item)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${
                        item.isActive ? "bg-orange-500" : "bg-gray-300 dark:bg-stone-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                          item.isActive ? "translate-x-4" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                  <div className="font-mono text-sm">
                    <span className="text-gray-900 dark:text-white">{item.from}</span>
                    <svg className="w-3 h-3 inline mx-1.5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                    <span className="text-orange-600">{item.to}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-gray-400 font-bold">{item.hitCount} {t("redirects.hits")}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-1.5 text-gray-400 hover:text-orange-600 transition-colors"
                        title="Edit"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: Table */}
            <div className="hidden md:block bg-white dark:bg-stone-900/80 border border-gray-200 dark:border-stone-700/50 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-600 dark:text-stone-300">
                  <thead className="bg-gray-50/50 dark:bg-stone-800/40 border-b border-gray-100 dark:border-stone-700/50">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">{t("redirects.fromUrl")}</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">{t("redirects.toUrl")}</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">{t("redirects.type")}</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">{t("redirects.hits")}</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">{t("redirects.status")}</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">{t("redirects.actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-stone-700/30">
                    {redirects.map((item) => (
                      <tr key={item._id} className="hover:bg-orange-50/20 dark:hover:bg-orange-500/5 transition-all">
                        <td className="px-4 py-3 font-mono text-gray-800 dark:text-stone-100">{item.from}</td>
                        <td className="px-4 py-3 font-mono text-orange-600">{item.to}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border bg-gray-50 dark:bg-stone-800/40 text-gray-700 dark:text-stone-300 border-gray-200 dark:border-stone-700/50">
                            {item.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{item.hitCount}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggle(item)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                              item.isActive ? "bg-orange-500" : "bg-gray-300 dark:bg-stone-700"
                            }`}
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                                item.isActive ? "translate-x-4" : "translate-x-0.5"
                              }`}
                            />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleEdit(item)} className="p-1 text-gray-400 hover:text-orange-600 transition-colors" title="Edit">
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                              </svg>
                            </button>
                            <button onClick={() => handleDelete(item._id)} className="p-1 text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )
      ) : logs.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-stone-900/80 border border-gray-200 dark:border-stone-700/50 rounded-2xl shadow-sm">
          <p className="text-gray-500 font-medium">{t("redirects.noLogs")}</p>
        </div>
      ) : (
        <>
          {/* Mobile: Single card list */}
          <div className="md:hidden bg-white dark:bg-stone-900/80 border border-gray-200 dark:border-stone-700/50 rounded-2xl shadow-sm divide-y divide-gray-100 dark:divide-stone-700/30">
            {logs.map((log) => (
              <div key={log._id} className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-mono text-sm font-bold text-gray-900 dark:text-white truncate">{log.url}</span>
                  <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black border bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800">
                    {log.totalHits || 1} {t("redirects.hits")}
                  </span>
                </div>
                {log.referrer && (
                  <p className="text-[10px] text-gray-400 truncate mb-3">{log.referrer}</p>
                )}
                <button
                  onClick={() => handleCreateFromLog(log.url)}
                  className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-orange-50 hover:bg-orange-100 dark:bg-orange-500/10 px-3 py-2 text-[10px] font-bold text-orange-600 dark:text-orange-400 transition-all"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  {t("redirects.createRedirect")}
                </button>
                <button
                  onClick={() => handleDeleteLog(log._id)}
                  className="inline-flex items-center justify-center rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-500/10 px-3 py-2 text-[10px] font-bold text-red-600 dark:text-red-400 transition-all"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Desktop: Table */}
          <div className="hidden md:block bg-white dark:bg-stone-900/80 border border-gray-200 dark:border-stone-700/50 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600 dark:text-stone-300">
                <thead className="bg-gray-50/50 dark:bg-stone-800/40 border-b border-gray-100 dark:border-stone-700/50">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">{t("redirects.url")}</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">{t("redirects.hits")}</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">{t("logs.time")}</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">{t("redirects.referrer")}</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">{t("redirects.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-stone-700/30">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-orange-50/20 dark:hover:bg-orange-500/5 transition-all">
                      <td className="px-4 py-3 font-mono text-gray-800 dark:text-stone-100">{log.url}</td>
                      <td className="px-4 py-3 font-mono font-bold text-gray-500">{log.totalHits || 1}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">
                        {new Date(log.created.at).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3 text-gray-500 truncate max-w-xs">{log.referrer || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleCreateFromLog(log.url)}
                            className="inline-flex items-center gap-1 rounded-lg bg-orange-50 hover:bg-orange-100 dark:bg-orange-500/10 px-2 py-1 text-[10px] font-bold text-orange-600 dark:text-orange-400 transition-all"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            {t("redirects.createRedirect")}
                          </button>
                          <button
                            onClick={() => handleDeleteLog(log._id)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
