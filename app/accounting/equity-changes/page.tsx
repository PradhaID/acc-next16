"use client";

import { useState, useEffect } from "react";
import PageHeader from "@/components/ui/PageHeader";
import { formatNumber } from "@/lib/format";
import { downloadXLSX } from "@/lib/xlsx";

interface EquityRow {
  description: string;
  shareCapital: number;
  retainedEarnings: number;
  otherReserves: number;
  total: number;
}

interface EquityChangesData {
  startDate: string;
  endDate: string;
  rows: EquityRow[];
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

export default function EquityChangesPage() {
  const [startDate, setStartDate] = useState(firstDayOfMonthStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [data, setData] = useState<EquityChangesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Statement of Changes in Equity - AccNext";
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
        rows: [
          {
            description: "Balance as of Start Date",
            shareCapital: 250000000,
            retainedEarnings: 154000000,
            otherReserves: 30000000,
            total: 434000000,
          },
          {
            description: "Net Profit for the Period",
            shareCapital: 0,
            retainedEarnings: 45000000,
            otherReserves: 0,
            total: 45000000,
          },
          {
            description: "Dividends Declared",
            shareCapital: 0,
            retainedEarnings: -5000000,
            otherReserves: 0,
            total: -5000000,
          },
          {
            description: "Issue of Share Capital",
            shareCapital: 50000000,
            retainedEarnings: 0,
            otherReserves: 0,
            total: 50000000,
          },
          {
            description: "Transfer to General Reserve",
            shareCapital: 0,
            retainedEarnings: -10000000,
            otherReserves: 10000000,
            total: 0,
          },
        ],
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
    rows.push(["STATEMENT OF CHANGES IN EQUITY"]);
    rows.push([`Period: ${data.startDate} to ${data.endDate}`]);
    rows.push([]);
    
    rows.push(["Description", "Share Capital", "Retained Earnings", "Other Reserves", "Total Equity"]);
    rows.push([]);
    
    for (const row of data.rows) {
      rows.push([
        row.description,
        row.shareCapital !== 0 ? row.shareCapital : "-",
        row.retainedEarnings !== 0 ? row.retainedEarnings : "-",
        row.otherReserves !== 0 ? row.otherReserves : "-",
        row.total,
      ]);
    }
    
    rows.push([]);
    rows.push([
      "Ending Balance",
      totalShareCapital,
      totalRetainedEarnings,
      totalOtherReserves,
      totalEquity,
    ]);
    
    downloadXLSX([{ name: "Equity Changes", rows }], `statement-of-changes-in-equity-${startDate}-${endDate}.xlsx`);
  };

  const totalShareCapital = data ? data.rows.reduce((s, r) => s + r.shareCapital, 0) : 0;
  const totalRetainedEarnings = data ? data.rows.reduce((s, r) => s + r.retainedEarnings, 0) : 0;
  const totalOtherReserves = data ? data.rows.reduce((s, r) => s + r.otherReserves, 0) : 0;
  const totalEquity = data ? data.rows.reduce((s, r) => s + r.total, 0) : 0;

  return (
    <div className="max-w-full mx-auto space-y-4 pb-10">
      <PageHeader title="Statement of Changes in Equity" subtitle="View movements in equity accounts, including share capital and retained earnings" />

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
          <p className="text-gray-500 font-medium">Select a date range to view the Statement of Changes in Equity.</p>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Share Capital</p>
              <p className="mt-1 font-mono text-lg font-bold text-gray-900 dark:text-white">{formatNumber(totalShareCapital)}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Retained Earnings</p>
              <p className="mt-1 font-mono text-lg font-bold text-gray-900 dark:text-white">{formatNumber(totalRetainedEarnings)}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Other Reserves</p>
              <p className="mt-1 font-mono text-lg font-bold text-gray-900 dark:text-white">{formatNumber(totalOtherReserves)}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-700/50 shadow-sm bg-emerald-50/[0.04]">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Total Equity</p>
              <p className="mt-1 font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatNumber(totalEquity)}</p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full table-auto border-collapse text-left">
                <thead className="bg-gray-50/50 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-700/50">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Description</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Share Capital</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Retained Earnings</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Other Reserves</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Total Equity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                  {data.rows.map((row, i) => {
                    const isOpening = i === 0;
                    return (
                      <tr
                        key={`eq-${i}`}
                        className={`group hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5 transition-all ${
                          isOpening ? "bg-gray-50/30 dark:bg-white/[0.02] font-semibold" : ""
                        }`}
                      >
                        <td className="px-6 py-3.5 text-xs text-gray-700 dark:text-gray-300">{row.description}</td>
                        <td className="px-6 py-3.5 text-right font-mono text-xs tabular-nums text-gray-700 dark:text-gray-300">
                          {row.shareCapital !== 0 ? formatNumber(row.shareCapital) : "-"}
                        </td>
                        <td className="px-6 py-3.5 text-right font-mono text-xs tabular-nums text-gray-700 dark:text-gray-300">
                          {row.retainedEarnings !== 0 ? formatNumber(row.retainedEarnings) : "-"}
                        </td>
                        <td className="px-6 py-3.5 text-right font-mono text-xs tabular-nums text-gray-700 dark:text-gray-300">
                          {row.otherReserves !== 0 ? formatNumber(row.otherReserves) : "-"}
                        </td>
                        <td className={`px-6 py-3.5 text-right font-mono text-xs tabular-nums font-bold ${row.total >= 0 ? "text-gray-900 dark:text-white" : "text-red-600"}`}>
                          {formatNumber(row.total)}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-emerald-50/40 dark:bg-emerald-500/[0.05] border-t-2 border-emerald-100 dark:border-emerald-500/20 font-bold">
                    <td className="px-6 py-4 text-xs text-gray-950 dark:text-white uppercase tracking-tight">Ending Balance</td>
                    <td className="px-6 py-4 text-right font-mono text-xs text-gray-950 dark:text-white">{formatNumber(totalShareCapital)}</td>
                    <td className="px-6 py-4 text-right font-mono text-xs text-gray-950 dark:text-white">{formatNumber(totalRetainedEarnings)}</td>
                    <td className="px-6 py-4 text-right font-mono text-xs text-gray-950 dark:text-white">{formatNumber(totalOtherReserves)}</td>
                    <td className="px-6 py-4 text-right font-mono text-xs text-gray-950 dark:text-white">{formatNumber(totalEquity)}</td>
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
