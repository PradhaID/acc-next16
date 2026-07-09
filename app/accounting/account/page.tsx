"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { downloadXLSX } from "@/lib/xlsx";
import PageHeader from "@/components/ui/PageHeader";
import { formatNumber } from "@/lib/format";
import { usePermission } from "@/hooks/useSession";
import { ROLES } from "@/lib/roles";

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

  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);

  const canEditAccount = usePermission(ROLES.EDIT_ACCOUNT);
  const canPrintPdf = usePermission(ROLES.ACCOUNT_PDF);
  const canDownloadXlsx = usePermission(ROLES.ACCOUNT_XLSX);

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

  const generatePdf = async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    let page = doc.addPage([612, 792]);
    const { width, height } = page.getSize();
    const margin = 48;
    let y = height - margin;
    const minY = 60;
    const rowH = 16;
    const colX = [margin, margin + 70, margin + 200, margin + 350, margin + 440, margin + 520];
    const colW = [70, 130, 150, 90, 80];

    const addPage = () => {
      page = doc.addPage([612, 792]);
      y = height - margin;
    };

    const drawText = (text: string, x: number, size: number, opts?: { bold?: boolean; color?: number[] }) => {
      const f = opts?.bold ? bold : font;
      page.drawText(text, { x, y: y - 2, size, font: f, color: rgb(opts?.color?.[0] ?? 0, opts?.color?.[1] ?? 0, opts?.color?.[2] ?? 0.4) });
    };

    const wrapText = (text: string, maxWidth: number, size: number): string[] => {
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (font.widthOfTextAtSize(testLine, size) > maxWidth) {
          if (currentLine) lines.push(currentLine);
          if (font.widthOfTextAtSize(word, size) > maxWidth) {
            let chars = '';
            for (const ch of word) {
              if (font.widthOfTextAtSize(chars + ch, size) > maxWidth) {
                lines.push(chars);
                chars = ch;
              } else {
                chars += ch;
              }
            }
            currentLine = chars;
          } else {
            currentLine = word;
          }
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);
      return lines.length ? lines : [''];
    };

    drawText("Accounts", margin, 18, { bold: true, color: [0, 0, 0] });
    y -= 24;
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1.5, color: rgb(0, 0, 0) });
    y -= rowH;

    drawText("Number", colX[0], 9, { bold: true, color: [0, 0, 0] });
    drawText("Account Name", colX[1], 9, { bold: true, color: [0, 0, 0] });
    drawText("COA", colX[2], 9, { bold: true, color: [0, 0, 0] });
    drawText("Category", colX[3], 9, { bold: true, color: [0, 0, 0] });
    drawText("Balance", colX[4], 9, { bold: true, color: [0, 0, 0] });
    y -= 4;
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
    y -= rowH;

    for (const a of filtered) {
      const coa = typeof a.coa === "string" ? coaMap.get(a.coa) : (a.coa as COA);
      const coaLabel = coa ? `${coa.code} – ${coa.name}` : "-";
      const coaCat = coa?.category || "-";
      const nameLines = wrapText(a.name, colW[1], 8);
      const coaLines = wrapText(coaLabel, colW[2], 7);
      const catLines = wrapText(coaCat, colW[3], 8);
      const lineCount = Math.max(nameLines.length, coaLines.length, catLines.length, 1);
      const rowHeight = rowH * lineCount;

      if (y - rowHeight < minY) addPage();

      drawText(a.number, colX[0], 8);
      for (let i = 0; i < lineCount; i++) {
        if (i > 0) y -= rowH;
        drawText(nameLines[i] ?? '', colX[1], 8);
        if (coaLines[i]) drawText(coaLines[i], colX[2], 7);
        if (catLines[i]) drawText(catLines[i], colX[3], 8);
        if (i === 0) drawText(formatNumber(a.balance), colX[4], 8);
      }
      y -= rowH;
    }

    y -= 4;
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
    y -= 16;
    drawText(`Total: ${filtered.length} accounts`, margin, 10, { bold: true });

    const bytes = await doc.save();
    setPdfBytes(bytes);
  };

  const handleDownloadXLSX = () => {
    const rows = filtered.map((a) => {
      const coa = typeof a.coa === "string" ? coaMap.get(a.coa) : (a.coa as COA);
      return {
        Number: a.number,
        "Account Name": a.name,
        Description: a.description || "",
        COA: coa ? `${coa.code} – ${coa.name}` : "-",
        Category: coa?.category || "-",
        Balance: a.balance,
        Status: a.isActive ? "Active" : "Inactive",
      };
    });
    downloadXLSX([{ name: "Accounts", rows }], `accounts.xlsx`);
  };

  return (
    <div className="max-w-full mx-auto space-y-4 pb-10">
      <PageHeader
        title="Accounts"
        subtitle="Manage your ledger accounts"
        actions={
          <div className="flex items-center gap-2">
            {canPrintPdf && (
              <button
                onClick={generatePdf}
                className="inline-flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-95"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
                </svg>
                Print PDF
              </button>
            )}
            {canDownloadXlsx && (
              <button
                onClick={handleDownloadXLSX}
                disabled={!filtered.length}
                className="inline-flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-40"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Excel
              </button>
            )}
            {usePermission(ROLES.ADD_ACCOUNT) && (
              <Link
                href="/accounting/account/add"
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-xs text-white px-3 py-2 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Account
              </Link>
            )}
          </div>
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
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Balance</th>
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
                          {canEditAccount && (
                            <Link
                              href={`/accounting/account/edit/${a._id}`}
                              className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 text-[10px] font-black uppercase tracking-wider"
                            >
                              Edit
                            </Link>
                          )}
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
                      <td className="px-4 py-3 text-right">
                        <span className={`font-mono text-sm tabular-nums ${a.balance >= 0 ? "text-gray-700 dark:text-gray-300" : "text-red-600"}`}>
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

      {pdfBytes && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-900 rounded-[32px] shadow-2xl w-full max-w-4xl h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Accounts PDF</h3>
              <button onClick={() => setPdfBytes(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                <svg className="w-6 h-6 text-gray-400 hover:text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 bg-gray-50 dark:bg-black/20 overflow-auto p-4">
              <iframe src={URL.createObjectURL(new Blob([pdfBytes as BlobPart], { type: "application/pdf" }))} className="w-full h-full rounded-xl border border-gray-200 dark:border-gray-800" />
            </div>
            <div className="p-6 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
              <button
                onClick={() => window.open(URL.createObjectURL(new Blob([pdfBytes as BlobPart], { type: "application/pdf" })))}
                className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
              >
                Download
              </button>
              <button onClick={() => setPdfBytes(null)} className="px-6 py-3 bg-gray-100 dark:bg-gray-800 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-gray-700 transition-all">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
