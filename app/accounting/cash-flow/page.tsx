"use client";

import { useState, useEffect } from "react";
import PageHeader from "@/components/ui/PageHeader";
import { formatNumber } from "@/lib/format";
import { downloadXLSX } from "@/lib/xlsx";

interface CashFlowItem {
  name: string;
  amount: number;
  isHeader?: boolean;
  isTotal?: boolean;
}

interface CashFlowData {
  startDate: string;
  endDate: string;
  operatingActivities: CashFlowItem[];
  investingActivities: CashFlowItem[];
  financingActivities: CashFlowItem[];
  netIncrease: number;
  beginningCash: number;
  endingCash: number;
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

function firstDayOfMonthStr(): string {
  const d = new Date();
  return toLocalDateString(new Date(d.getFullYear(), d.getMonth(), 1));
}

export default function CashFlowPage() {
  const [startDate, setStartDate] = useState(firstDayOfMonthStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [data, setData] = useState<CashFlowData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Statement of Cash Flows - AccNext";
  }, []);

  const handleView = async () => {
    setLoading(true);
    setError("");
    try {
      // Simulate API load / mock response for skeleton integration
      await new Promise((resolve) => setTimeout(resolve, 800));

      setData({
        startDate,
        endDate,
        operatingActivities: [
          { name: "Net Income", amount: 45000000 },
          { name: "Depreciation & Amortization", amount: 5000000 },
          { name: "Increase in Accounts Receivable", amount: -12000000 },
          { name: "Increase in Inventory", amount: -8000000 },
          { name: "Increase in Accounts Payable", amount: 6500000 },
        ],
        investingActivities: [
          { name: "Purchase of Equipment", amount: -25000000 },
          { name: "Proceeds from Sale of Vehicle", amount: 15000000 },
        ],
        financingActivities: [
          { name: "Proceeds from Bank Loans", amount: 30000000 },
          { name: "Repayment of Loans", amount: -10000000 },
          { name: "Dividends Paid", amount: -5000000 },
        ],
        netIncrease: 41500000,
        beginningCash: 120000000,
        endingCash: 161500000,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadXLSX = () => {
    if (!data) return;
    const rows: any[][] = [];
    rows.push(["STATEMENT OF CASH FLOWS"]);
    rows.push([`Period: ${data.startDate} to ${data.endDate}`]);
    rows.push([]);
    
    rows.push(["Activities & Categories", "Amount"]);
    rows.push([]);
    
    rows.push(["Cash Flows from Operating Activities"]);
    for (const item of data.operatingActivities) {
      rows.push([`   ${item.name}`, item.amount]);
    }
    rows.push(["Net cash provided by Operating Activities", totalOperating]);
    rows.push([]);
    
    rows.push(["Cash Flows from Investing Activities"]);
    for (const item of data.investingActivities) {
      rows.push([`   ${item.name}`, item.amount]);
    }
    rows.push(["Net cash used in Investing Activities", totalInvesting]);
    rows.push([]);
    
    rows.push(["Cash Flows from Financing Activities"]);
    for (const item of data.financingActivities) {
      rows.push([`   ${item.name}`, item.amount]);
    }
    rows.push(["Net cash provided by Financing Activities", totalFinancing]);
    rows.push([]);
    
    rows.push(["Net Increase in Cash & Cash Equivalents", data.netIncrease]);
    rows.push(["Cash at Beginning of Period", data.beginningCash]);
    rows.push(["Cash at End of Period", data.endingCash]);
    
    downloadXLSX([{ name: "Cash Flows", rows }], `statement-of-cash-flows-${startDate}-${endDate}.xlsx`);
  };

  const totalOperating = data ? data.operatingActivities.reduce((s, r) => s + r.amount, 0) : 0;
  const totalInvesting = data ? data.investingActivities.reduce((s, r) => s + r.amount, 0) : 0;
  const totalFinancing = data ? data.financingActivities.reduce((s, r) => s + r.amount, 0) : 0;

  return (
    <div className="max-w-full mx-auto space-y-4 pb-10">
      <PageHeader title="Statement of Cash Flows" subtitle="View Cash Flows from Operating, Investing, and Financing activities" />

      {/* Filter bar */}
      <div className="flex flex-col md:flex-row md:items-center gap-2 bg-white dark:bg-gray-900 p-2 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm">
        {/* Date Range */}
        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all flex-1">
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
          disabled={loading}
          className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl text-[11px] font-black uppercase tracking-tight transition-all hover:scale-105 active:scale-95"
        >
          {loading ? "Loading…" : "View"}
        </button>
        <button
          onClick={handleDownloadXLSX}
          disabled={!data || loading}
          className="px-5 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          XLSX
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      )}

      {!data && !loading && !error && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/50 rounded-2xl py-20 text-center shadow-sm">
          <p className="text-gray-500 font-medium">Select a date range to view the Statement of Cash Flows.</p>
        </div>
      )}

      {loading && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/50 rounded-2xl py-20 text-center shadow-sm">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      )}

      {data && !loading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Beginning Cash Balance</p>
              <p className="mt-1 font-mono text-lg font-bold text-gray-900 dark:text-white">{formatNumber(data.beginningCash)}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Net Increase / Decrease</p>
              <p className={`mt-1 font-mono text-lg font-bold ${data.netIncrease >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {data.netIncrease >= 0 ? "+" : ""}{formatNumber(data.netIncrease)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ending Cash Balance</p>
              <p className="mt-1 font-mono text-lg font-bold text-gray-900 dark:text-white">{formatNumber(data.endingCash)}</p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full table-auto border-collapse text-left">
                <thead className="bg-gray-50/50 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-700/50">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Activities & Categories</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                  {/* Operating Activities Section */}
                  <tr className="bg-gray-50/30 dark:bg-white/[0.02]">
                    <td className="px-6 py-3 font-bold text-xs text-gray-950 dark:text-gray-50" colSpan={2}>
                      Cash Flows from Operating Activities
                    </td>
                  </tr>
                  {data.operatingActivities.map((row, i) => (
                    <tr key={`op-${i}`} className="group hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5 transition-all">
                      <td className="px-8 py-3 text-xs text-gray-700 dark:text-gray-300">{row.name}</td>
                      <td className="px-6 py-3 text-right font-mono text-xs tabular-nums text-gray-700 dark:text-gray-300">
                        {row.amount >= 0 ? formatNumber(row.amount) : `(${formatNumber(Math.abs(row.amount))})`}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50/20 dark:bg-white/[0.01] font-semibold border-b border-gray-100 dark:border-gray-700/50">
                    <td className="px-8 py-3 text-xs text-gray-900 dark:text-white">Net cash provided by Operating Activities</td>
                    <td className="px-6 py-3 text-right font-mono text-xs font-bold text-gray-900 dark:text-white">
                      {totalOperating >= 0 ? formatNumber(totalOperating) : `(${formatNumber(Math.abs(totalOperating))})`}
                    </td>
                  </tr>

                  {/* Investing Activities Section */}
                  <tr className="bg-gray-50/30 dark:bg-white/[0.02]">
                    <td className="px-6 py-3 font-bold text-xs text-gray-950 dark:text-gray-50" colSpan={2}>
                      Cash Flows from Investing Activities
                    </td>
                  </tr>
                  {data.investingActivities.map((row, i) => (
                    <tr key={`inv-${i}`} className="group hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5 transition-all">
                      <td className="px-8 py-3 text-xs text-gray-700 dark:text-gray-300">{row.name}</td>
                      <td className="px-6 py-3 text-right font-mono text-xs tabular-nums text-gray-700 dark:text-gray-300">
                        {row.amount >= 0 ? formatNumber(row.amount) : `(${formatNumber(Math.abs(row.amount))})`}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50/20 dark:bg-white/[0.01] font-semibold border-b border-gray-100 dark:border-gray-700/50">
                    <td className="px-8 py-3 text-xs text-gray-900 dark:text-white">Net cash used in Investing Activities</td>
                    <td className="px-6 py-3 text-right font-mono text-xs font-bold text-gray-900 dark:text-white">
                      {totalInvesting >= 0 ? formatNumber(totalInvesting) : `(${formatNumber(Math.abs(totalInvesting))})`}
                    </td>
                  </tr>

                  {/* Financing Activities Section */}
                  <tr className="bg-gray-50/30 dark:bg-white/[0.02]">
                    <td className="px-6 py-3 font-bold text-xs text-gray-950 dark:text-gray-50" colSpan={2}>
                      Cash Flows from Financing Activities
                    </td>
                  </tr>
                  {data.financingActivities.map((row, i) => (
                    <tr key={`fin-${i}`} className="group hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5 transition-all">
                      <td className="px-8 py-3 text-xs text-gray-700 dark:text-gray-300">{row.name}</td>
                      <td className="px-6 py-3 text-right font-mono text-xs tabular-nums text-gray-700 dark:text-gray-300">
                        {row.amount >= 0 ? formatNumber(row.amount) : `(${formatNumber(Math.abs(row.amount))})`}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50/20 dark:bg-white/[0.01] font-semibold border-b border-gray-100 dark:border-gray-700/50">
                    <td className="px-8 py-3 text-xs text-gray-900 dark:text-white">Net cash provided by Financing Activities</td>
                    <td className="px-6 py-3 text-right font-mono text-xs font-bold text-gray-900 dark:text-white">
                      {totalFinancing >= 0 ? formatNumber(totalFinancing) : `(${formatNumber(Math.abs(totalFinancing))})`}
                    </td>
                  </tr>

                  {/* Net Increase / Balances Section */}
                  <tr className="bg-emerald-50/20 dark:bg-emerald-500/[0.02] border-t-2 border-gray-200 dark:border-gray-700/50">
                    <td className="px-6 py-3 text-xs font-bold text-gray-900 dark:text-white">Net Increase in Cash & Cash Equivalents</td>
                    <td className="px-6 py-3 text-right font-mono text-xs font-bold text-gray-900 dark:text-white">
                      {data.netIncrease >= 0 ? formatNumber(data.netIncrease) : `(${formatNumber(Math.abs(data.netIncrease))})`}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-3 text-xs font-semibold text-gray-750 dark:text-gray-200">Cash at Beginning of Period</td>
                    <td className="px-6 py-3 text-right font-mono text-xs font-semibold text-gray-750 dark:text-gray-200">
                      {formatNumber(data.beginningCash)}
                    </td>
                  </tr>
                  <tr className="bg-emerald-50/40 dark:bg-emerald-500/[0.05] border-t border-emerald-100 dark:border-emerald-500/20">
                    <td className="px-6 py-3.5 text-xs font-black text-gray-950 dark:text-white uppercase tracking-tight">Cash at End of Period</td>
                    <td className="px-6 py-3.5 text-right font-mono text-xs font-black text-gray-950 dark:text-white">
                      {formatNumber(data.endingCash)}
                    </td>
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
