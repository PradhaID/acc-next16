"use client";

import { useState, useEffect, useCallback } from "react";
import PageHeader from "@/components/ui/PageHeader";
import { formatNumber } from "@/lib/format";
import { localDateEndUTC } from "@/lib/timezone";
import { useFormatDateInTimezone } from "@/hooks/useTimezone";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

interface AccountLine {
  number: string;
  name: string;
  balance: number;
}

interface TreeNode {
  _id: string;
  code: string;
  name: string;
  position: "Db" | "Cr";
  children: TreeNode[];
  total: number;
  accounts: AccountLine[];
}

interface BalanceSheetData {
  asOfDate: string;
  assets: TreeNode;
  liabilities: TreeNode;
  equity: TreeNode;
  netIncome: number;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const fm = (v: number) => formatNumber(v, 0);

const sectionColors: Record<string, { text: string; bg: string; border: string; badge: string }> = {
  Assets: { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "border-emerald-200 dark:border-emerald-500/20", badge: "bg-emerald-600" },
  Liabilities: { text: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/10", border: "border-red-200 dark:border-red-500/20", badge: "bg-red-600" },
  Equity: { text: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10", border: "border-blue-200 dark:border-blue-500/20", badge: "bg-blue-600" },
};

function TreeItems({
  nodes,
  depth,
  showCode,
  collapsed,
  onToggle,
  colors,
}: {
  nodes: TreeNode[];
  depth: number;
  showCode: boolean;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  colors: { text: string; bg: string; border: string; badge: string };
}) {
  return (
    <>
      {nodes.map((node) => {
        const isL2 = depth === 1;
        const isL3 = depth === 2;
        const hasChildren = node.children.length > 0;
        const isLeaf = !hasChildren;
        const isCollapsible = isL3 && node.children.length > 0;
        const isCollapsed = collapsed.has(node._id);
        const showBalance = !isL3 || !hasChildren || isCollapsed;

        const codeStr = showCode && node.code ? String(node.code).padStart(5, '\u00a0') : null;
        const padLeft = showCode ? (depth === 1 ? 4 : depth === 2 ? 12 : depth === 3 ? 8 : 0) : depth >= 3 ? 16 : 0;

        return (
          <div key={node._id}>
            <div
              className={`flex items-center justify-between px-4 py-1.5 transition-colors ${
                isL2
                  ? `font-bold ${colors.bg} ${colors.text}`
                  : "text-gray-600 dark:text-gray-400"
              }`}
              style={{ paddingLeft: `${12 + padLeft}px` }}
            >
              <div className="flex items-center gap-2 min-w-0">
                {isCollapsible && (
                  <button
                    onClick={() => onToggle(node._id)}
                    className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0"
                  >
                    <svg
                      className={`w-3 h-3 text-gray-400 transition-transform ${isCollapsed ? "" : "rotate-90"}`}
                      fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                )}
                {!isCollapsible && <span className="w-4 shrink-0" />}
                {codeStr ? (
                  <span className="text-xs font-mono text-gray-400 dark:text-gray-500 shrink-0">{codeStr}</span>
                ) : null}
                <span className={`text-sm font-bold truncate ${isLeaf ? "font-medium" : ""}`}>{node.name}</span>
              </div>
              {showBalance && (
                <span className={`font-mono text-sm font-black shrink-0 ml-4 ${node.total >= 0 ? "text-gray-900 dark:text-white" : "text-red-600"}`}>
                  {fm(node.total)}
                </span>
              )}
            </div>
            {hasChildren && !isCollapsed && (
              <TreeItems
                nodes={node.children}
                depth={depth + 1}
                showCode={showCode}
                collapsed={collapsed}
                onToggle={onToggle}
                colors={colors}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

export default function BalanceSheetPage() {
  const { formatDate } = useFormatDateInTimezone();
  const [date, setDate] = useState(todayStr);
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);

  useEffect(() => { document.title = "Balance Sheet - AccNext"; }, []);

  const toggleCollapsed = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/accounting/balance-sheet?date=${localDateEndUTC(date).toISOString()}`);
        if (!cancelled && res.ok) setData(await res.json());
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [date]);

  const totalLiabilitiesEquity = data
    ? data.liabilities.total + data.equity.total
    : 0;

  const isBalanced = data && Math.abs(data.assets.total - totalLiabilitiesEquity) < 0.01;

  type FlatRow = { depth: number; name: string; code: string; total: number };
  function flattenTree(root: TreeNode): FlatRow[] {
    const rows: FlatRow[] = [];
    for (const child of root.children) {
      rows.push({ depth: 0, name: child.name, code: child.code, total: child.total });
      if (child.children.length > 0) {
        for (const sub of child.children) {
          rows.push({ depth: 1, name: sub.name, code: sub.code, total: sub.total });
          if (sub.children.length > 0) {
            for (const acct of sub.children) {
              rows.push({ depth: 2, name: acct.name, code: acct.code, total: acct.total });
            }
          }
        }
      }
    }
    return rows;
  }

  async function generatePdf() {
    if (!data) return;
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontB = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const page = pdfDoc.addPage([612, 792]);
    const pw = page.getWidth();
    const ph = page.getHeight();
    const ml = 50;
    const colW = (pw - ml * 2 - 30) / 2;

    function drawText(text: string, x: number, y: number, size: number, opts?: { bold?: boolean; color?: number[]; align?: 'left' | 'right' | 'center' }) {
      const f = opts?.bold ? fontB : font;
      const c = opts?.color ? rgb(opts.color[0], opts.color[1], opts.color[2]) : rgb(0, 0, 0);
      let tx = x;
      if (opts?.align === 'right') tx = x - f.widthOfTextAtSize(text, size);
      else if (opts?.align === 'center') tx = x - f.widthOfTextAtSize(text, size) / 2;
      page.drawText(text, { x: tx, y, size, font: f, color: c });
    }

    function drawLine(y: number, x1: number, x2: number, thick?: number) {
      page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: thick || 0.5, color: rgb(0, 0, 0) });
    }

    // Header
    drawText('BALANCE SHEET', pw / 2, ph - 50, 16, { bold: true, align: 'center' });
    drawText(`As of ${formatDate(data.asOfDate)}`, pw / 2, ph - 70, 10, { align: 'center', color: [0.4, 0.4, 0.4] });
    drawLine(ph - 80, ml, pw - ml);

    // Flatten sections
    const assetsFlat = flattenTree(data.assets);
    const liabFlat = flattenTree(data.liabilities);
    const equityFlat = flattenTree(data.equity);

    function drawSection(title: string, rows: FlatRow[], total: number, x: number, startY: number, extraRows?: FlatRow[]): number {
      let y = startY;

      function wrapText(text: string, x0: number, y0: number, maxW: number, size: number, opts?: { bold?: boolean; color?: number[] }): number {
        const f = opts?.bold ? fontB : font;
        const c = opts?.color ? rgb(opts.color[0], opts.color[1], opts.color[2]) : rgb(0, 0, 0);
        const words = text.split(' ');
        let line = '';
        let ly = y0;
        for (const w of words) {
          const test = line ? `${line} ${w}` : w;
          if (f.widthOfTextAtSize(test, size) > maxW && line) {
            page.drawText(line, { x: x0, y: ly, size, font: f, color: c });
            ly -= size + 2;
            line = w;
          } else {
            line = test;
          }
        }
        if (line) page.drawText(line, { x: x0, y: ly, size, font: f, color: c });
        return ly;
      }

      drawText(title, x, y, 10, { bold: true });
      y -= 4;
      drawLine(y, x, x + colW);
      y -= 18;

      for (const r of rows) {
        const indent = r.depth * 16;
        const fs = r.depth >= 2 ? 8 : 9;
        const availW = colW - indent - 60;
        const ly = wrapText(r.name, x + indent, y, availW, fs, { bold: r.depth === 0 });
        drawText(fm(r.total), x + colW, y, fs, { align: 'right', bold: true });
        y = ly - 15;
      }

      if (extraRows) {
        for (const r of extraRows) {
          const fs = 9;
          const ly = wrapText(r.name, x + 14, y, colW - 14 - 60, fs, { color: [0.2, 0.3, 0.8] });
          drawText(fm(r.total), x + colW, y, fs, { align: 'right', bold: true, color: [0.2, 0.3, 0.8] });
          y = ly - 15;
        }
      }

      y -= 4;
      drawLine(y, x, x + colW, 2);
      y -= 12;
      drawText(`Total ${title}`, x, y, 10, { bold: true });
      drawText(fm(total), x + colW, y, 10, { align: 'right', bold: true });
      y -= 24;

      return y;
    }

    const leftX = ml;
    const rightX = ml + colW + 30;

    // Draw Assets (left column)
    const assetsEndY = drawSection('ASSETS', assetsFlat, data.assets.total, leftX, ph - 96);

    // Draw Liabilities (right column, top)
    const liabEndY = drawSection('LIABILITIES', liabFlat, data.liabilities.total, rightX, ph - 96);

    // Draw Equity (right column, below liabilities)
    const netIncomeRows = data.netIncome > 0 ? [{ depth: 0, name: 'Current Year Earnings', code: '', total: data.netIncome }] : [];
    const equityEndY = drawSection('EQUITY', equityFlat, data.equity.total, rightX, liabEndY, netIncomeRows);

    // Grand total (right column)
    const grandEndY = equityEndY - 4;
    drawLine(grandEndY, rightX, rightX + colW, 2);
    drawText('TOTAL LIABILITIES & EQUITY', rightX, grandEndY - 12, 10, { bold: true });
    drawText(fm(totalLiabilitiesEquity), rightX + colW, grandEndY - 12, 10, { align: 'right', bold: true });

    // Balanced status
    const balanceText = isBalanced ? 'Balance Sheet is Balanced' : 'Out of Balance';
    drawText(balanceText, pw / 2, 40, 9, { bold: true, align: 'center', color: isBalanced ? [0.1, 0.5, 0.1] : [0.7, 0.1, 0.1] });

    setPdfBytes(await pdfDoc.save());
  }

  function downloadCSV() {
    if (!data) return;
    const rows: string[] = [];
    rows.push('"Balance Sheet"');
    rows.push(`"As of ${data.asOfDate}"`);
    rows.push('');

    const sections = [
      { label: 'Assets', root: data.assets, color: '' },
      { label: 'Liabilities', root: data.liabilities, color: '' },
      { label: 'Equity', root: data.equity, color: '' },
    ];

    for (const { label, root } of sections) {
      rows.push(`"${label}"`);
      const tree = flattenTree(root);
      const netIncomeRow = label === 'Equity' && data.netIncome > 0 ? { depth: 1, name: 'Current Year Earnings', code: '', total: data.netIncome, section: 'Equity' } : null;
      if (netIncomeRow) tree.push(netIncomeRow);
      for (const r of tree) {
        const indent = '  '.repeat(r.depth + 1);
        rows.push(`${indent}"${r.name}",${r.total}`);
      }
      rows.push(`"Total ${label}",${root.total}`);
      rows.push('');
    }

    rows.push(`"Total Liabilities & Equity",${totalLiabilitiesEquity}`);
    if (isBalanced) rows.push('"Balanced"');
    else rows.push('"Out of Balance"');

    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `balance-sheet-${data.asOfDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="max-w-full mx-auto space-y-4 pb-10">
      <PageHeader title="Balance Sheet" subtitle="Statement of financial position" />

      {/* Filter bar */}
      <div className="flex items-center gap-2 bg-white dark:bg-gray-900 p-2 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm">
        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all">
          <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-transparent text-[11px] font-bold outline-none w-[140px] text-gray-700 dark:text-gray-300"
          />
        </div>
        <button
          onClick={() => setShowCode(!showCode)}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border ${
            showCode
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-indigo-300"
          }`}
        >
          Code
        </button>
        <button
          onClick={() => { generatePdf(); }}
          className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-indigo-300"
        >
          Print PDF
        </button>
        <button
          onClick={downloadCSV}
          disabled={!data || loading}
          className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Excel
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-2xl text-xs font-bold">
          {error}
        </div>
      )}

      {loading && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/50 rounded-2xl py-20 text-center shadow-sm">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      )}

      {!data && !loading && !error && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/50 rounded-2xl py-20 text-center shadow-sm">
          <p className="text-gray-500 font-medium">Select a date to view the balance sheet.</p>
        </div>
      )}

      {data && !loading && (
        <>
          {/* Header card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm overflow-hidden text-center py-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Balance Sheet</h2>
            <p className="text-xs font-bold text-gray-400">As of {formatDate(data.asOfDate)}</p>
          </div>

          {/* Two-column body */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* LEFT: Assets */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm overflow-hidden">
              <div className={`px-4 py-2.5 ${sectionColors.Assets.bg} border-b ${sectionColors.Assets.border}`}>
                <h3 className={`text-[10px] font-black uppercase tracking-widest ${sectionColors.Assets.text}`}>Assets</h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800/50">
                <TreeItems
                  nodes={data.assets.children}
                  depth={1}
                  showCode={showCode}
                  collapsed={collapsed}
                  onToggle={toggleCollapsed}
                  colors={sectionColors.Assets}
                />
              </div>
              <div className="px-4 py-2.5">
                <div className={`${sectionColors.Assets.badge} rounded-lg px-3 py-2`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/90">Total Assets</span>
                    <span className="font-mono text-sm font-black text-white">{fm(data.assets.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Liabilities + Equity */}
            <div className="space-y-4">
              {/* Liabilities */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm overflow-hidden">
                <div className={`px-4 py-2.5 ${sectionColors.Liabilities.bg} border-b ${sectionColors.Liabilities.border}`}>
                  <h3 className={`text-[10px] font-black uppercase tracking-widest ${sectionColors.Liabilities.text}`}>Liabilities</h3>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800/50">
                <TreeItems
                  nodes={data.liabilities.children}
                  depth={1}
                  showCode={showCode}
                  collapsed={collapsed}
                  onToggle={toggleCollapsed}
                  colors={sectionColors.Liabilities}
                />
                </div>
                <div className="px-4 py-2.5">
                  <div className={`${sectionColors.Liabilities.badge} rounded-lg px-3 py-2`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/90">Total Liabilities</span>
                      <span className="font-mono text-sm font-black text-white">{fm(data.liabilities.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Equity */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm overflow-hidden">
                <div className={`px-4 py-2.5 ${sectionColors.Equity.bg} border-b ${sectionColors.Equity.border}`}>
                  <h3 className={`text-[10px] font-black uppercase tracking-widest ${sectionColors.Equity.text}`}>Equity</h3>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800/50">
                <TreeItems
                  nodes={data.equity.children}
                  depth={1}
                  showCode={showCode}
                  collapsed={collapsed}
                  onToggle={toggleCollapsed}
                  colors={sectionColors.Equity}
                />
                </div>
                {data.netIncome > 0 && (
                  <div className="flex items-center justify-between px-4 py-2.5 text-sm text-blue-600 dark:text-blue-400 font-bold">
                    <span>Current Year Earnings</span>
                    <span className="font-mono text-sm font-black">{fm(data.netIncome)}</span>
                  </div>
                )}
                <div className="px-4 py-2.5">
                  <div className={`${sectionColors.Equity.badge} rounded-lg px-3 py-2`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/90">Total Equity</span>
                      <span className="font-mono text-sm font-black text-white">{fm(data.equity.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Grand total + Balanced status */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm overflow-hidden">
            <div className="px-4 py-3">
              <div className="border-t-2 border-gray-800 dark:border-gray-200 pt-2">
                <Line2
                  label={<span className="text-xs font-black uppercase tracking-widest">TOTAL LIABILITIES &amp; EQUITY</span>}
                  value={totalLiabilitiesEquity}
                  className="text-sm font-black text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className={`py-3 px-5 border-t border-gray-200 dark:border-gray-700/50 flex items-center justify-center gap-2 ${
              isBalanced ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"
            }`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                {isBalanced ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                )}
              </svg>
              <span className="text-[10px] font-black uppercase tracking-widest">
                {isBalanced ? "Balance Sheet is Balanced" : "Out of Balance"}
              </span>
              <span className="mx-2 text-gray-300 dark:text-gray-600">|</span>
              <span className="text-[10px] font-bold font-mono">
                {fm(data.assets.total)} = {fm(data.liabilities.total)} + {fm(data.equity.total)}
              </span>
            </div>
          </div>
        </>
      )}
      {pdfBytes && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700/50">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">Balance Sheet PDF</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' }); window.open(URL.createObjectURL(blob)); }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-tight transition-all"
                >
                  Download
                </button>
                <button
                  onClick={() => setPdfBytes(null)}
                  className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all"
                >
                  Close
                </button>
              </div>
            </div>
            <iframe
              src={URL.createObjectURL(new Blob([pdfBytes as BlobPart], { type: 'application/pdf' }))}
              className="flex-1 w-full bg-white"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Line2({
  label,
  value,
  className = "",
}: {
  label: React.ReactNode;
  value: number;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <span className="text-sm font-black">{label}</span>
      <span className="font-mono text-sm font-black">{fm(value)}</span>
    </div>
  );
}
