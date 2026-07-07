"use client";

import { useState, useEffect } from "react";
import PageHeader from "@/components/ui/PageHeader";
import { formatNumber } from "@/lib/format";
import { useFormatDateInTimezone } from "@/hooks/useTimezone";
import { formatDateInTimezone, localDateStartUTC, localDateEndUTC } from "@/lib/timezone";
import { downloadXLSX } from "@/lib/xlsx";

interface Account {
  _id: string;
  number: string;
  name: string;
}

interface LedgerRow {
  date: string;
  code: string;
  information: string;
  debit: number;
  credit: number;
  balance: number;
}

interface LedgerData {
  account: { number: string; name: string };
  coa: { name: string; position: string; category: string };
  openingBalance: number;
  startDate: string;
  endDate: string;
  rows: LedgerRow[];
}

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayStr(): string {
  return toLocalDateString(new Date());
}

export default function LedgerPage() {
  const { formatDate } = useFormatDateInTimezone();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountId, setAccountId] = useState("");
  const [accountSearch, setAccountSearch] = useState("");
  const [accountResults, setAccountResults] = useState<Account[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [data, setData] = useState<LedgerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canDownloadXlsx = true;

  useEffect(() => { document.title = "Ledger - AccNext"; }, []);

  useEffect(() => {
    fetch("/api/accounting/account?all=true")
      .then((r) => r.json())
      .then(setAccounts)
      .catch(() => setError("Failed to load accounts."))
      .finally(() => setAccountsLoading(false));
  }, []);

  const searchAccounts = (query: string) => {
    setAccountSearch(query);
    if (query.length < 1) {
      setAccountResults([]);
      return;
    }
    const q = query.toLowerCase();
    const filtered = accounts.filter(
      (a) => a.number.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)
    );
    setAccountResults(filtered.slice(0, 10));
    setShowDropdown(filtered.length > 0);
  };

  const selectAccount = (acc: Account) => {
    setAccountId(acc._id);
    setAccountSearch(`${acc.number} – ${acc.name}`);
    setShowDropdown(false);
  };

  const handleView = async () => {
    if (!accountId) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        accountId,
        startDate: localDateStartUTC(startDate).toISOString(),
        endDate: localDateEndUTC(endDate).toISOString(),
      });
      const res = await fetch(`/api/accounting/ledger?${params}`);
      if (!res.ok) throw new Error("Failed to load ledger.");
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadXLSX = () => {
    if (!data) return;
    downloadXLSX([
      {
        name: "Ledger",
        rows: [
          {
            "Account Number": data.account.number,
            "Account Name": data.account.name,
            "COA Category": data.coa.category,
            "Position": data.coa.position,
            "Opening Balance": data.openingBalance,
            "Start Date": data.startDate,
            "End Date": data.endDate,
          },
          {},
          ...data.rows.map((r) => ({
            Date: r.date,
            Code: r.code,
            Information: r.information,
            Debit: r.debit,
            Credit: r.credit,
            Balance: r.balance,
          })),
        ],
      },
    ], `ledger-${data.account.number}-${startDate}-${endDate}.xlsx`);
  };

  const totalDebit = data ? data.rows.reduce((s, r) => s + r.debit, 0) : 0;
  const totalCredit = data ? data.rows.reduce((s, r) => s + r.credit, 0) : 0;
  const lastBalance = data ? (data.rows.length > 0 ? data.rows[data.rows.length - 1].balance : data.openingBalance) : 0;

  return (
    <div className="max-w-full mx-auto space-y-4 pb-10">
      <PageHeader title="Ledger" subtitle="View account ledger details" />

      {/* Filter bar */}
      <div className="flex flex-col md:flex-row md:items-center gap-2 bg-white dark:bg-gray-900 p-2 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm">
        {/* Account search */}
        <div className="relative flex-1">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Search account…"
            value={accountSearch}
            onChange={(e) => searchAccounts(e.target.value)}
            onFocus={() => {
              if (accountResults.length > 0) setShowDropdown(true);
            }}
            className="w-full pl-9 pr-4 py-2 bg-transparent outline-none text-sm border-r border-gray-100 dark:border-gray-800 focus:ring-0"
          />
          {showDropdown && accountResults.length > 0 && (
            <>
              <div className="fixed inset-0 z-[9998]" onClick={() => setShowDropdown(false)} />
              <div className="absolute z-[9999] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {accountResults.map((acc) => (
                  <button
                    key={acc._id}
                    type="button"
                    onClick={() => selectAccount(acc)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
                  >
                    <div className="font-bold text-gray-900 dark:text-white">{acc.number} – {acc.name}</div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all">
          <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            max={endDate}
            className="bg-transparent text-[11px] font-bold outline-none w-[125px] text-gray-700 dark:text-gray-300"
          />
          <span className="text-gray-300 dark:text-gray-600 text-xs font-bold">—</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate}
            max={todayStr()}
            className="bg-transparent text-[11px] font-bold outline-none w-[125px] text-gray-700 dark:text-gray-300"
          />
        </div>

        <button
          onClick={handleView}
          disabled={loading || !accountId}
          className="px-5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl text-[11px] font-black uppercase tracking-tight transition-all hover:scale-105 active:scale-95"
        >
          {loading ? "Loading…" : "View"}
        </button>
        {canDownloadXlsx && (
          <button
            onClick={handleDownloadXLSX}
            disabled={!data || loading}
            className="px-5 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            XLSX
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      )}

      {!data && !loading && !error && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/50 rounded-2xl py-20 text-center shadow-sm">
          <p className="text-gray-500 font-medium">Select an account and date range to view the ledger.</p>
        </div>
      )}

      {loading && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/50 rounded-2xl py-20 text-center shadow-sm">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      )}

      {data && !loading && (
        <>
          {/* Summary card */}
          <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Account Number</p>
                <p className="mt-1 font-mono text-sm font-bold text-gray-900 dark:text-white">{data.account.number}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Account Name</p>
                <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{data.account.name}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">COA Category / Position</p>
                <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{data.coa.category} / {data.coa.position}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Opening Balance</p>
                <p className="mt-1 font-mono text-sm font-bold text-gray-900 dark:text-white">{formatNumber(data.openingBalance)}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Closing Balance</p>
                <p className={`mt-1 font-mono text-sm font-bold ${lastBalance >= 0 ? "text-gray-900 dark:text-white" : "text-red-600"}`}>
                  {formatNumber(lastBalance)}
                </p>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full table-auto border-collapse text-left">
                <thead className="bg-gray-50/50 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Date</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Code</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Information</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Debit</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Credit</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                  <tr className="bg-gray-50/30 dark:bg-white/[0.02]">
                    <td className="px-4 py-3 text-gray-500 text-xs font-bold" colSpan={3}>Opening Balance</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-gray-500">-</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-gray-500">-</td>
                    <td className="px-4 py-3 text-right font-mono text-xs font-bold text-gray-900 dark:text-white">
                      {formatNumber(data.openingBalance)}
                    </td>
                  </tr>
                  {data.rows.map((row, i) => (
                    <tr
                      key={`${row.code}-${i}`}
                      className="group hover:bg-indigo-50/40 dark:hover:bg-indigo-500/5 transition-all"
                    >
                      <td className="px-4 py-3 text-xs font-medium text-gray-700 dark:text-gray-300">
                        {formatDate(row.date)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{row.code}</td>
                      <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">{row.information}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-gray-700 dark:text-gray-300">
                        {row.debit > 0 ? formatNumber(row.debit) : "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-gray-700 dark:text-gray-300">
                        {row.credit > 0 ? formatNumber(row.credit) : "-"}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono text-xs tabular-nums font-bold ${
                        row.balance >= 0
                          ? "text-gray-900 dark:text-white"
                          : "text-red-600"
                      }`}>
                        {formatNumber(row.balance)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50/50 dark:bg-white/[0.04] border-t-2 border-gray-100 dark:border-gray-700/50">
                    <td className="px-4 py-3 text-xs font-bold text-gray-900 dark:text-white" colSpan={3}>Total</td>
                    <td className="px-4 py-3 text-right font-mono text-xs font-bold text-gray-900 dark:text-white">
                      {formatNumber(totalDebit)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs font-bold text-gray-900 dark:text-white">
                      {formatNumber(totalCredit)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs font-bold text-gray-500">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
