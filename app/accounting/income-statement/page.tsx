"use client";

import { useState, useEffect } from "react";
import PageHeader from "@/components/ui/PageHeader";
import { formatNumber } from "@/lib/format";
import { useFormatDateInTimezone } from "@/hooks/useTimezone";
import { localDateStartUTC, localDateEndUTC } from "@/lib/timezone";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

interface CoaNode {
  _id: string;
  code: string;
  name: string;
  position: string;
  category: string;
  parent: string | null;
  children: CoaNode[];
  total: number;
}

interface IncomeStatementData {
  startDate: string;
  endDate: string;
  revenue: CoaNode;
  cogs: CoaNode;
  expenses: CoaNode;
  grossProfit: number;
  netProfit: number;
}

function toLocalDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayStr(): string {
  return toLocalDateString(new Date());
}

function yearStartStr(): string {
  const d = new Date();
  d.setMonth(0, 1);
  return toLocalDateString(d);
}

const sectionColors: Record<string, { text: string; bg: string; border: string; badge: string }> = {
  Revenue: { text: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-500/10", border: "border-violet-200 dark:border-violet-500/20", badge: "bg-violet-600" },
  COGS: { text: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-500/10", border: "border-rose-200 dark:border-rose-500/20", badge: "bg-rose-600" },
  Expense: { text: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/10", border: "border-red-200 dark:border-red-500/20", badge: "bg-red-600" },
};

function getDepth(node: CoaNode, allNodes: CoaNode[], depth = 0): number {
  if (!node.parent) return depth;
  const parent = allNodes.find((n) => n._id === node.parent);
  if (!parent) return depth;
  return getDepth(parent, allNodes, depth + 1);
}


function TreeItems({
  nodes,
  depth,
  colors,
  collapsed,
  onToggle,
  showCode,
}: {
  nodes: CoaNode[];
  depth: number;
  colors: { text: string; bg: string; border: string; badge: string };
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  showCode: boolean;
}) {
  return (
    <>
      {nodes.map((node) => {
        const isCollapsed = collapsed.has(node._id);
        const hasChildren = node.children.length > 0;
        const isLeaf = !hasChildren;
        const codeStr = showCode && node.code ? String(node.code).padStart(5, '\u00a0') : null;
        const padLeft = showCode ? (depth === 0 ? 24 : depth === 2 ? 8 : 0) : depth >= 2 ? 16 : 0;

        return (
          <div key={node._id}>
            <div
              className={`flex items-center justify-between px-4 py-2.5 transition-colors ${
                depth === 0
                  ? `${colors.bg} ${colors.text}`
                  : "text-gray-700 dark:text-gray-300"
              }`}
              style={{ paddingLeft: `${12 + padLeft}px` }}
            >
              <div className="flex items-center gap-2 min-w-0">
                {hasChildren && (
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
                {isLeaf && <span className="w-4 shrink-0" />}
                {codeStr ? (
                  <span className="text-xs font-mono text-gray-400 dark:text-gray-500 shrink-0">{codeStr}</span>
                ) : null}
                <span className={`text-sm font-bold truncate ${isLeaf ? "font-medium" : ""}`}>{node.name}</span>
              </div>
              <span className={`font-mono text-sm font-black shrink-0 ml-4 ${depth === 0 ? "text-inherit" : node.total >= 0 ? "text-gray-900 dark:text-white" : "text-red-600"}`}>
                {formatNumber(node.total)}
              </span>
            </div>

            {hasChildren && !isCollapsed && (
              <TreeItems
                nodes={node.children}
                depth={depth + 1}
                colors={colors}
                collapsed={collapsed}
                onToggle={onToggle}
                showCode={showCode}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

function SectionCard({ node, colors, collapsed, onToggle, showCode }: { node: CoaNode; colors: typeof sectionColors.Revenue; collapsed: Set<string>; onToggle: (id: string) => void; showCode: boolean }) {
  const hasContent = node.children.length > 0;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm overflow-hidden">
      <div className={`px-4 py-2.5 ${colors.bg} border-b ${colors.border}`}>
        <h3 className={`text-[10px] font-black uppercase tracking-widest ${colors.text}`}>{node.name}</h3>
      </div>
      {hasContent ? (
        <>
          <div className="divide-y divide-gray-100 dark:divide-gray-800/50">
            <TreeItems
              nodes={node.children}
              depth={0}
              colors={colors}
              collapsed={collapsed}
              onToggle={onToggle}
              showCode={showCode}
            />
          </div>
          <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-800/50">
            <div className={`${colors.badge} rounded-lg px-3 py-2`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/90">Total {node.name}</span>
                <span className="font-mono text-sm font-black text-white">{formatNumber(node.total)}</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="px-4 py-6 text-center">
          <p className="text-[10px] text-gray-400 italic">No transactions in this period</p>
        </div>
      )}
    </div>
  );
}

type FlatRow = { depth: number; name: string; total: number };
function flattenTree(node: CoaNode): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const child of node.children) {
    rows.push({ depth: 0, name: child.name, total: child.total });
    flattenChildren(child, 1, rows);
  }
  return rows;
}
function flattenChildren(node: CoaNode, depth: number, rows: FlatRow[]) {
  for (const child of node.children) {
    rows.push({ depth, name: child.name, total: child.total });
    flattenChildren(child, depth + 1, rows);
  }
}

export default function IncomeStatementPage() {
  const { formatDate } = useFormatDateInTimezone();
  const [startDate, setStartDate] = useState(yearStartStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [data, setData] = useState<IncomeStatementData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [showCode, setShowCode] = useState(false);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);

  useEffect(() => { document.title = "Income Statement - AccNext"; }, []);

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => { handleView(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleView = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        startDate: localDateStartUTC(startDate).toISOString(),
        endDate: localDateEndUTC(endDate).toISOString(),
      });
      const res = await fetch(`/api/accounting/income-statement?${params}`);
      if (!res.ok) throw new Error("Failed to load income statement.");
      setData(await res.json());
      setCollapsed(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  async function generatePdf() {
    if (!data) return;
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontB = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pw = 612;
    const ph = 792;
    const ml = 50;
    const colW = pw - ml * 2;
    const minY = 65;

    let curPage = pdfDoc.addPage([pw, ph]);
    let pageNum = 1;

    function drawText(text: string, x: number, y: number, size: number, opts?: { bold?: boolean; color?: number[]; align?: 'left' | 'right' | 'center' }) {
      const f = opts?.bold ? fontB : font;
      const c = opts?.color ? rgb(opts.color[0], opts.color[1], opts.color[2]) : rgb(0, 0, 0);
      let tx = x;
      if (opts?.align === 'right') tx = x - f.widthOfTextAtSize(text, size);
      else if (opts?.align === 'center') tx = x - f.widthOfTextAtSize(text, size) / 2;
      curPage.drawText(text, { x: tx, y, size, font: f, color: c });
    }

    function drawLine(y: number, x1: number, x2: number, thick?: number) {
      curPage.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: thick || 0.5, color: rgb(0, 0, 0) });
    }

    function addPage() {
      pageNum++;
      curPage = pdfDoc.addPage([pw, ph]);
      drawText('INCOME STATEMENT (cont.)', pw / 2, ph - 50, 14, { bold: true, align: 'center' });
      drawText(`${formatDate(data!.startDate)} — ${formatDate(data!.endDate)}`, pw / 2, ph - 70, 10, { align: 'center', color: [0.4, 0.4, 0.4] });
      drawLine(ph - 80, ml, pw - ml);
    }

    function ensureSpace(needed: number, y: number): number {
      if (y - needed < minY) {
        addPage();
        return ph - 96;
      }
      return y;
    }

    function wrapText(text: string, x0: number, y0: number, maxW: number, size: number, opts?: { bold?: boolean; color?: number[] }): number {
      const f = opts?.bold ? fontB : font;
      const c = opts?.color ? rgb(opts.color[0], opts.color[1], opts.color[2]) : rgb(0, 0, 0);
      const words = text.split(' ');
      let line = '';
      let ly = y0;
      for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        if (f.widthOfTextAtSize(test, size) > maxW && line) {
          ly = ensureSpace(size + 4, ly);
          curPage.drawText(line, { x: x0, y: ly, size, font: f, color: c });
          ly -= size + 2;
          if (ly < minY) ly = ensureSpace(size + 4, ly);
          line = w;
        } else {
          line = test;
        }
      }
      if (line) {
        ly = ensureSpace(size + 4, ly);
        curPage.drawText(line, { x: x0, y: ly, size, font: f, color: c });
      }
      return ly;
    }

    function drawSection(title: string, rows: FlatRow[], total: number, startY: number): number {
      let y = ensureSpace(60, startY);
      drawText(title, ml, y, 10, { bold: true });
      y -= 4;
      drawLine(y, ml, ml + colW);
      y -= 18;

      for (const r of rows) {
        const indent = r.depth * 16;
        const fs = r.depth >= 2 ? 8 : 9;
        const availW = colW - indent - 60;
        y = ensureSpace(22, y);
        const ly = wrapText(r.name, ml + indent, y, availW, fs);
        drawText(String(r.total), ml + colW, y, fs, { align: 'right', bold: true });
        y = ly - 15;
      }

      y = ensureSpace(50, y);
      y -= 4;
      drawLine(y, ml, ml + colW, 2);
      y -= 12;
      drawText(`Total ${title}`, ml, y, 10, { bold: true });
      drawText(String(total), ml + colW, y, 10, { align: 'right', bold: true });
      y -= 24;
      return y;
    }

    // Header
    drawText('INCOME STATEMENT', pw / 2, ph - 50, 16, { bold: true, align: 'center' });
    drawText(`${formatDate(data.startDate)} — ${formatDate(data.endDate)}`, pw / 2, ph - 70, 10, { align: 'center', color: [0.4, 0.4, 0.4] });
    drawLine(ph - 80, ml, pw - ml);

    let y = ph - 96;

    // Revenue
    const revFlat = flattenTree(data.revenue);
    y = drawSection('Revenue', revFlat, data.revenue.total, y);

    // COGS
    const cogsFlat = flattenTree(data.cogs);
    y = drawSection('Cost of Goods Sold', cogsFlat, data.cogs.total, y);

    // Gross Profit
    y -= 8;
    y = ensureSpace(30, y);
    drawText('Gross Profit', ml, y, 10, { bold: true, color: [0.3, 0.3, 0.3] });
    drawText(String(data.grossProfit), ml + colW, y, 10, { align: 'right', bold: true, color: data.grossProfit >= 0 ? [0.1, 0.5, 0.1] : [0.7, 0.1, 0.1] });
    y -= 28;

    // Expenses
    const expFlat = flattenTree(data.expenses);
    y = drawSection('Expenses', expFlat, data.expenses.total, y);

    // Net Profit/Loss
    y -= 8;
    y = ensureSpace(40, y);
    drawLine(y, ml, ml + colW, 2);
    y -= 14;
    const netLabel = data.netProfit >= 0 ? 'Net Profit' : 'Net Loss';
    drawText(netLabel, ml, y, 12, { bold: true });
    drawText(String(data.netProfit), ml + colW, y, 12, { align: 'right', bold: true, color: data.netProfit >= 0 ? [0.1, 0.5, 0.1] : [0.7, 0.1, 0.1] });

    // Page numbers
    const totalPages = pdfDoc.getPageCount();
    for (let i = 0; i < totalPages; i++) {
      const pg = pdfDoc.getPages()[i];
      const numText = `Page ${i + 1} of ${totalPages}`;
      const tw = font.widthOfTextAtSize(numText, 8);
      pg.drawText(numText, { x: pw - ml - tw, y: 30, size: 8, font, color: rgb(0.5, 0.5, 0.5) });
    }

    setPdfBytes(await pdfDoc.save());
  }

  return (
    <div className="max-w-full mx-auto space-y-4 pb-10">
      <PageHeader title="Income Statement" subtitle="Profit & loss report" />

      {/* Filter bar */}
      <div className="flex flex-col md:flex-row md:items-center gap-2 bg-white dark:bg-gray-900 p-2 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm">
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
          disabled={loading}
          className="px-5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl text-[11px] font-black uppercase tracking-tight transition-all hover:scale-105 active:scale-95"
        >
          {loading ? "Loading\u2026" : "View"}
        </button>

        <button
          onClick={() => setShowCode((c) => !c)}
          className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all ${
            showCode
              ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
              : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Code
        </button>
        <button
          onClick={() => { generatePdf(); }}
          className="px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-900/50"
        >
          Print PDF
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
          <p className="text-gray-500 font-medium">Select a date range to view the income statement.</p>
        </div>
      )}

      {data && !loading && (
        <>
          <div className="bg-white dark:bg-gray-900 px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm">
            <div className="flex items-baseline gap-2">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Income Statement</h2>
              <span className="text-[10px] font-bold text-gray-500">
                {formatDate(data.startDate)} — {formatDate(data.endDate)}
              </span>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard node={data.revenue} colors={sectionColors.Revenue} collapsed={collapsed} onToggle={toggleCollapse} showCode={showCode} />
            <SectionCard node={data.cogs} colors={sectionColors.COGS} collapsed={collapsed} onToggle={toggleCollapse} showCode={showCode} />
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-yellow-50/50 dark:bg-transparent border-b border-yellow-200/50 dark:border-gray-700/50">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-yellow-700 dark:text-yellow-400">Gross Profit</h3>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-500">Revenue — COGS</span>
              <span className={`font-mono text-lg font-black ${data.grossProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {formatNumber(data.grossProfit)}
              </span>
            </div>
          </div>

          <div className="lg:w-1/2">
            <SectionCard node={data.expenses} colors={sectionColors.Expense} collapsed={collapsed} onToggle={toggleCollapse} showCode={showCode} />
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm overflow-hidden">
            <div className={`px-4 py-3 ${data.netProfit >= 0 ? "bg-emerald-50/50 dark:bg-transparent border-b border-emerald-200/50 dark:border-gray-700/50" : "bg-red-50/50 dark:bg-transparent border-b border-red-200/50 dark:border-gray-700/50"}`}>
              <h3 className={`text-[10px] font-black uppercase tracking-widest ${data.netProfit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
                Net {data.netProfit >= 0 ? "Profit" : "Loss"}
              </h3>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-500">Gross Profit — Total Expenses</span>
              <span className={`font-mono text-lg font-black ${data.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {formatNumber(data.netProfit)}
              </span>
            </div>
          </div>
        </>
      )}
      {pdfBytes && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700/50">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">Income Statement PDF</h2>
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
