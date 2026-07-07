"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import { formatNumber } from "@/lib/format";

interface COA {
  _id: string;
  code: string;
  name: string;
  category: string;
  parent: string | null;
}

interface Account {
  _id: string;
  coa: COA | string;
  number: string;
  name: string;
  description: string;
  balance: number;
  isActive: boolean;
}

function flattenCoa(nodes: COA[], parentId: string | null = null): COA[] {
  return nodes
    .filter((n) => (n.parent || null) === parentId)
    .sort((a, b) => Number(a.code) - Number(b.code))
    .reduce((acc: COA[], child) => [...acc, child, ...flattenCoa(nodes, child._id)], []);
}

function getDepth(parentId: string | null, allNodes: COA[]): number {
  if (!parentId) return 0;
  let depth = 0;
  let currentId: string | null = parentId;
  while (currentId) {
    const p = allNodes.find((n) => n._id === currentId);
    if (!p) break;
    depth++;
    currentId = p.parent || null;
    if (depth > 5) break;
  }
  return depth;
}

const categoryColors: Record<string, string> = {
  Asset: "bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400",
  Liability: "bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-400",
  Equity: "bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-400",
  Revenue: "bg-violet-50 border-violet-100 text-violet-600 dark:bg-violet-950/20 dark:border-violet-800 dark:text-violet-400",
  Expense: "bg-red-50 border-red-100 text-red-600 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400",
};

export default function AccountListPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [coas, setCoas] = useState<COA[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [coaFilter, setCoaFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">("all");

  useEffect(() => { document.title = "Accounts - AccNext"; }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      if (!cancelled) setLoading(true);
      try {
        const [acctRes, coaRes] = await Promise.all([
          fetch("/api/accounting/account?all=true"),
          fetch("/api/accounting/coa?all=true"),
        ]);
        const acctData = acctRes.ok ? await acctRes.json() : [];
        const coaData = coaRes.ok ? await coaRes.json() : [];
        if (!cancelled) {
          setAccounts(acctData);
          setCoas(coaData);
        }
      } catch {
        //
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, []);

  const coaMap = new Map<string, COA>();
  coas.forEach((c) => coaMap.set(c._id, c));

  const filtered = accounts.filter((a) => {
    const coa = typeof a.coa === "string" ? coaMap.get(a.coa) : (a.coa as COA);

    const matchesSearch =
      !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.number.toLowerCase().includes(search.toLowerCase()) ||
      (coa?.name || "").toLowerCase().includes(search.toLowerCase());

    const matchesCoa = !coaFilter || coa?._id === coaFilter;

    const matchesActive =
      activeFilter === "all"
        ? true
        : activeFilter === "true"
          ? a.isActive
          : !a.isActive;

    return matchesSearch && matchesCoa && matchesActive;
  });

  const resetFilters = () => {
    setSearch("");
    setCoaFilter("");
    setActiveFilter("all");
  };

  return (
    <div className="max-w-full mx-auto space-y-4 pb-10">
      <PageHeader
        title="Accounts"
        subtitle="Manage your ledger accounts"
        actions={
          <Link
            href="/accounting/account/add"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-xs text-white px-3 py-2 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Account
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
            placeholder="Search by name, number, COA…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-transparent outline-none text-sm border-r border-gray-100 dark:border-gray-800 focus:ring-0"
          />
        </div>

        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all">
          <select
            value={coaFilter}
            onChange={(e) => setCoaFilter(e.target.value)}
            className="bg-transparent text-[11px] font-bold outline-none cursor-pointer min-w-[200px] text-gray-700 dark:text-gray-300"
          >
            <option value="">All COAs</option>
            {flattenCoa(coas).map((c) => {
              const depth = getDepth(c._id, coas);
              return (
                <option key={c._id} value={c._id} disabled={depth < 3}>
                  {"\u00A0".repeat(depth * 3)}{depth > 0 ? "↳ " : ""}{c.code} – {c.name}
                </option>
              );
            })}
          </select>
        </div>

        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all">
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as "all" | "true" | "false")}
            className="bg-transparent text-[11px] font-bold outline-none cursor-pointer min-w-[120px] text-gray-700 dark:text-gray-300"
          >
            <option value="all">All Status</option>
            <option value="true">Active</option>
            <option value="false">Deactivated</option>
          </select>
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
          <div className="py-20 text-center space-y-4">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-gray-500 font-medium">No accounts match your criteria.</p>
            <button onClick={resetFilters} className="mt-4 text-indigo-600 font-bold hover:underline">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse text-left">
              <thead className="bg-gray-50/50 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Number</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Account Name</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">COA</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Category</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Balance</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                {filtered.map((a) => {
                  const coa = typeof a.coa === "string" ? coaMap.get(a.coa) : (a.coa as COA);
                  return (
                    <tr key={a._id} className="group hover:bg-indigo-50/40 dark:hover:bg-indigo-500/5 transition-all cursor-pointer">
                      {/* Number */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono font-medium text-xs text-gray-600 dark:text-gray-300">
                          {a.number}
                        </span>
                      </td>

                      {/* Name + actions (bottom, on hover) */}
                      <td className="px-4 py-3 relative group-hover:pb-8 transition-all duration-200">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {a.name}
                          </p>
                          {a.description && (
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 line-clamp-1 mt-0.5">
                              {a.description}
                            </p>
                          )}
                        </div>
                        <div className="absolute bottom-1.5 left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <Link
                            href={`/accounting/account/edit/${a._id}`}
                            className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 text-[10px] font-black uppercase tracking-wider"
                          >
                            Edit
                          </Link>
                        </div>
                      </td>

                      {/* COA */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                          {coa ? `${coa.code} – ${coa.name}` : "-"}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${coa ? (categoryColors[coa.category] || "") : ""}`}>
                          {coa?.category || "-"}
                        </span>
                      </td>

                      {/* Balance */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm tabular-nums text-gray-700 dark:text-gray-300">
                          {formatNumber(a.balance)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {a.isActive ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Deactivated
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
