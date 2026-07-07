"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import { formatNumber } from "@/lib/format";
import { useFormatDateInTimezone, FormattedDateTime } from "@/hooks/useTimezone";

interface Transaction {
  _id: string;
  code: string;
  type: string;
  effectiveDate: string;
  reference: string;
  information: string;
  amount: number;
  status: string;
  created: { at: string; by: string | null };
}

const statusColors: Record<string, string> = {
  Pending: "bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-400",
  Confirmed: "bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400",
  Rejected: "bg-red-50 border-red-100 text-red-600 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400",
  Reversed: "bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-400",
};

export default function TransactionListPage() {
  const { formatDate } = useFormatDateInTimezone();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [usersMap, setUsersMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => { document.title = "Transactions - AccNext"; }, []);

  useEffect(() => {
    fetch("/api/system/users")
      .then((r) => r.json())
      .then((data: { _id: string; fullName: string; username: string }[]) =>
        setUsersMap(new Map(data.map((u) => [u._id, u.fullName || u.username])))
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchTransactions = async () => {
      if (!cancelled) setLoading(true);
      try {
        const params = new URLSearchParams();
        if (statusFilter !== "all") params.set("status", statusFilter);
        const res = await fetch(`/api/accounting/transaction?${params}`);
        const data: Transaction[] = await res.json();
        if (!cancelled) setTransactions(data);
      } catch {
        if (!cancelled) setTransactions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchTransactions();
    return () => { cancelled = true; };
  }, [statusFilter]);

  const filtered = transactions.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.code.toLowerCase().includes(q) ||
      (t.information || "").toLowerCase().includes(q) ||
      (t.reference || "").toLowerCase().includes(q)
    );
  });

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };

  return (
    <div className="max-w-full mx-auto space-y-4 pb-10">
      <PageHeader
        title="Transactions"
        subtitle="Journal entries"
        actions={
          <Link
            href="/accounting/transaction/add"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-xs text-white px-3 py-2 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Transaction
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
            placeholder="Search by code, information, reference…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-transparent outline-none text-sm border-r border-gray-100 dark:border-gray-800 focus:ring-0"
          />
        </div>

        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent text-[11px] font-bold outline-none cursor-pointer min-w-[120px] text-gray-700 dark:text-gray-300"
          >
            <option value="all">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Rejected">Rejected</option>
            <option value="Reversed">Reversed</option>
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
            <p className="text-gray-500 font-medium">No transactions match your criteria.</p>
            <button onClick={resetFilters} className="mt-4 text-indigo-600 font-bold hover:underline">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse text-left">
              <thead className="bg-gray-50/50 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Code</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Date</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Information</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Amount</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                {filtered.map((t) => (
                  <tr key={t._id} className="group hover:bg-indigo-50/40 dark:hover:bg-indigo-500/5 transition-all cursor-pointer">
                    {/* Code + actions (bottom, on hover) */}
                    <td className="px-4 py-3 relative group-hover:pb-6 transition-all duration-200">
                      <Link
                        href={`/accounting/transaction/detail/${t._id}`}
                        className="font-bold text-indigo-600 dark:text-indigo-400 text-sm hover:underline"
                      >
                        {t.code}
                      </Link>
                      <div className="absolute bottom-1.5 left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1">
                        <Link
                          href={`/accounting/transaction/detail/${t._id}`}
                          className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 text-[10px] font-black uppercase tracking-wider"
                        >
                          View
                        </Link>
                        {t.status === "Pending" && (
                          <>
                            <span className="text-gray-300 dark:text-gray-600">|</span>
                            <Link
                              href={`/accounting/transaction/edit/${t._id}`}
                              className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 text-[10px] font-black uppercase tracking-wider"
                            >
                              Edit
                            </Link>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap">
                        {formatDate(t.effectiveDate)}
                      </span>
                    </td>

                    {/* Information */}
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">
                        {t.information || <span className="text-gray-400 italic">No information</span>}
                      </p>
                      {t.reference && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Ref: {t.reference}
                        </p>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                        {formatNumber(t.amount)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${statusColors[t.status] || ""}`}>
                        {t.status}
                      </span>
                    </td>

                    {/* Created */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {t.created?.at ? (
                        <div className="text-left">
                          <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                            <FormattedDateTime date={t.created.at} />
                          </p>
                          {t.created?.by && (
                            <p className="text-[10px] text-gray-400 font-medium">
                              {usersMap.get(t.created.by) || "—"}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
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
