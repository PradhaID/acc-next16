"use client";

import { useState, useEffect, useMemo } from "react";
import PageHeader from "@/components/ui/PageHeader";
import { formatCurrency } from "@/lib/format";
import { useFormatDateInTimezone } from "@/hooks/useTimezone";

interface COA {
  _id: string;
  name: string;
  category: string;
}

interface Account {
  _id: string;
  number: string;
  name: string;
  coa: COA | string;
}

interface ClosingTransaction {
  _id: string;
  code: string;
  effectiveDate: string;
  amount: number;
}

interface ClosingResult {
  message: string;
  netProfit: number;
  linesCount: number;
}

export default function ClosingPage() {
  const { formatDate } = useFormatDateInTimezone();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [coas, setCoas] = useState<COA[]>([]);
  const [fiscalYear, setFiscalYear] = useState(String(new Date().getFullYear()));
  const [retainedEarningsAccountId, setRetainedEarningsAccountId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ClosingResult | null>(null);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [history, setHistory] = useState<ClosingTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => { document.title = "Closing - AccNext"; }, []);

  useEffect(() => {
    async function init() {
      try {
        const [acctRes, coaRes, txnRes] = await Promise.all([
          fetch("/api/accounting/account?all=true"),
          fetch("/api/accounting/coa"),
          fetch("/api/accounting/transaction?status=Confirmed"),
        ]);
        const accts: Account[] = acctRes.ok ? await acctRes.json() : [];
        const coaData: COA[] = coaRes.ok ? await coaRes.json() : [];
        const txns: ClosingTransaction[] = txnRes.ok ? await txnRes.json() : [];

        setAccounts(accts);
        setCoas(coaData);
        setHistory(txns.filter((t) => t.code.startsWith("CLS-")));
      } catch {
        //
      } finally {
        setHistoryLoading(false);
      }
    }
    init();
  }, []);

  const coaMap = useMemo(() => {
    const map = new Map<string, COA>();
    for (const c of coas) map.set(c._id, c);
    return map;
  }, [coas]);

  const equityAccounts = useMemo(
    () =>
      accounts.filter((a) => {
        const coa = typeof a.coa === "string" ? coaMap.get(a.coa) : (a.coa as COA);
        return coa?.category === "Equity";
      }),
    [accounts, coaMap]
  );

  const handleExecute = async () => {
    if (!fiscalYear || !retainedEarningsAccountId) return;
    setSubmitting(true);
    setError("");
    setConfirming(false);
    try {
      const res = await fetch("/api/accounting/closing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fiscalYear: Number(fiscalYear),
          retainedEarningsAccountId,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to execute closing.");
      }
      const data: ClosingResult = await res.json();
      setResult(data);

      const txnRes = await fetch("/api/accounting/transaction?status=Confirmed");
      if (txnRes.ok) {
        const txns: ClosingTransaction[] = await txnRes.json();
        setHistory(txns.filter((t) => t.code.startsWith("CLS-")));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-full mx-auto space-y-4 pb-10">
      <PageHeader title="Year-End Closing" subtitle="Close the fiscal year" />

      {/* Warning banner */}
      <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-4 rounded-2xl">
        <div className="flex items-start gap-3">
          <svg className="mt-0.5 w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-300">Important</h3>
            <p className="mt-1 text-xs font-bold text-amber-700 dark:text-amber-400">
              Year-end closing will transfer all revenue, COGS, and expense account balances to the
              retained earnings account. This action cannot be undone. Ensure all transactions
              for the fiscal year have been confirmed before proceeding.
            </p>
          </div>
        </div>
      </div>

      {/* Parameters card */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm">
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                Fiscal Year
              </label>
              <input
                type="number"
                value={fiscalYear}
                onChange={(e) => setFiscalYear(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-indigo-500 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white sm:w-44"
              />
            </div>
            <div className="space-y-1 flex-1 min-w-[200px]">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                Retained Earnings Account
              </label>
              <select
                value={retainedEarningsAccountId}
                onChange={(e) => setRetainedEarningsAccountId(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-indigo-500 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white appearance-none cursor-pointer"
              >
                <option value="">Select account</option>
                {equityAccounts.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.number} — {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            {!confirming ? (
              <button
                onClick={() => setConfirming(true)}
                disabled={!fiscalYear || !retainedEarningsAccountId}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m9 12.75 3 3m0 0 3-3m-3 3v-7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                Execute Closing
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold text-gray-500">
                  Close fiscal year {fiscalYear}? This cannot be undone.
                </span>
                <button
                  onClick={handleExecute}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl font-bold text-xs transition-all hover:scale-105 active:scale-95"
                >
                  {submitting ? "Processing…" : "Confirm"}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  disabled={submitting}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/50 text-xs px-4 py-2 rounded-xl font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-2xl text-xs font-bold">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-5 rounded-2xl">
          <div className="flex items-start gap-3">
            <svg className="mt-0.5 w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-300">Closing Completed</h3>
              <p className="mt-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">{result.message}</p>
              <div className="mt-3 flex items-center gap-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Net Profit / Loss</p>
                  <p className={`font-mono text-lg font-bold ${
                    result.netProfit >= 0
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-red-600 dark:text-red-400"
                  }`}>
                    {formatCurrency(result.netProfit)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Journal Lines</p>
                  <p className="font-mono text-lg font-bold text-emerald-700 dark:text-emerald-300">{result.linesCount}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Closing History */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Closing History</h3>
        {historyLoading ? (
          <div className="py-10 text-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : history.length === 0 ? (
          <p className="py-10 text-center text-xs font-bold text-gray-500">No closing transactions found.</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800/50">
            {history.map((t) => (
              <div key={t._id} className="flex items-center justify-between py-3 group hover:bg-indigo-50/40 dark:hover:bg-indigo-500/5 transition-all -mx-6 px-6">
                <div>
                  <p className="font-mono text-sm font-bold text-gray-900 dark:text-white">{t.code}</p>
                  <p className="text-[10px] font-bold text-gray-500">{formatDate(t.effectiveDate)}</p>
                </div>
                <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">
                  {formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
