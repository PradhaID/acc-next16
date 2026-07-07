"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { downloadXLSX } from "@/lib/xlsx";
import PageHeader from "@/components/ui/PageHeader";
import { usePermission } from "@/hooks/useSession";
import { ROLES } from "@/lib/roles";

interface COA {
  _id: string;
  parent?: { _id: string; code: string; name: string } | string | null;
  code: number;
  name: string;
  description?: string;
  category: string;
  position: "Db" | "Cr";
  isActive: boolean;
}

function getDepth(coa: COA, map: Map<string, COA>): number {
  let depth = 1;
  let cur = coa;
  while (cur.parent) {
    const parentId = typeof cur.parent === "object" && cur.parent !== null
      ? (cur.parent as { _id: string })._id
      : cur.parent;
    const parent = map.get(parentId);
    if (!parent) break;
    depth++;
    cur = parent;
    if (depth > 5) break;
  }
  return depth;
}

function flattenCoa(nodes: COA[], parentId: string | null = null): COA[] {
  return nodes
    .filter((n) => {
      const pId = typeof n.parent === "object" && n.parent !== null
        ? (n.parent as { _id: string })._id
        : n.parent || null;
      return pId === parentId;
    })
    .sort((a, b) => a.code - b.code)
    .reduce((acc: COA[], child) => [...acc, child, ...flattenCoa(nodes, child._id)], []);
}

const categoryColors: Record<string, string> = {
  Asset: "bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-800",
  Liability: "bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-950/20 dark:border-amber-800",
  Equity: "bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-950/20 dark:border-blue-800",
  Revenue: "bg-violet-50 border-violet-100 text-violet-600 dark:bg-violet-950/20 dark:border-violet-800",
  COGS: "bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-950/20 dark:border-rose-800",
  Expense: "bg-red-50 border-red-100 text-red-600 dark:bg-red-950/20 dark:border-red-800",
};

const positionStyles: Record<string, string> = {
  Db: "bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-800",
  Cr: "bg-orange-50 border-orange-100 text-orange-600 dark:bg-orange-950/20 dark:border-orange-800",
};

export default function COAListPage() {
  const [coaList, setCoaList] = useState<COA[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">("all");
  const [parentFilter, setParentFilter] = useState("");

  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);

  const canEditCoa = usePermission(ROLES.EDIT_COA);
  const canPrintPdf = usePermission(ROLES.COA_PDF);
  const canDownloadXlsx = usePermission(ROLES.COA_XLSX);

  useEffect(() => { document.title = "Chart of Accounts - AccNext"; }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchCoa = async () => {
      if (!cancelled) setLoading(true);
      try {
        const res = await fetch("/api/accounting/coa?all=true");
        const data = await res.json();
        if (!cancelled) {
          const sorted = flattenCoa(data, null);
          setCoaList(sorted);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setCoaList([]);
          setLoading(false);
        }
      }
    };
    fetchCoa();
    return () => { cancelled = true; };
  }, []);

  const fullMapById = new Map<string, COA>();
  coaList.forEach((c) => fullMapById.set(c._id, c));

  function getDescendantIds(id: string): Set<string> {
    const ids = new Set<string>([id]);
    const children = coaList.filter((c) => {
      const pId = typeof c.parent === "object" && c.parent !== null
        ? (c.parent as { _id: string })._id
        : c.parent || null;
      return pId === id;
    });
    for (const child of children) {
      const childIds = getDescendantIds(child._id);
      childIds.forEach((cid) => ids.add(cid));
    }
    return ids;
  }

  const parentDescendantIds = parentFilter ? getDescendantIds(parentFilter) : null;

  const filtered = coaList.filter((c) => {
    const matchesSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      String(c.code).includes(search) ||
      (c.description ?? "").toLowerCase().includes(search.toLowerCase());

    const matchesActive =
      activeFilter === "all"
        ? true
        : activeFilter === "true"
          ? c.isActive
          : !c.isActive;

    const matchesParent = !parentDescendantIds || parentDescendantIds.has(c._id);

    return matchesSearch && matchesActive && matchesParent;
  });

  const resetFilters = () => {
    setSearch("");
    setActiveFilter("all");
    setParentFilter("");
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
    const colX = [margin, margin + 40, margin + 220, margin + 370, margin + 460, margin + 520];
    const colW = [40, 180, 150, 90, 60];

    const addPage = () => {
      page = doc.addPage([612, 792]);
      y = height - margin;
    };

    const ensureSpace = () => { if (y - rowH < minY) addPage(); };

    const drawText = (text: string, x: number, size: number, opts?: { bold?: boolean; color?: number[] }) => {
      const f = opts?.bold ? bold : font;
      page.drawText(text, { x, y: y - 2, size, font: f, color: rgb(opts?.color?.[0] ?? 0, opts?.color?.[1] ?? 0, opts?.color?.[2] ?? 0.4) });
    };

    // Title
    drawText("Chart of Accounts", margin, 18, { bold: true, color: [0, 0, 0] });
    y -= 24;
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1.5, color: rgb(0, 0, 0) });
    y -= rowH;

    // Header row
    drawText("Code", colX[0], 9, { bold: true, color: [0, 0, 0] });
    drawText("Account Name", colX[1], 9, { bold: true, color: [0, 0, 0] });
    drawText("Category", colX[2], 9, { bold: true, color: [0, 0, 0] });
    drawText("Pos", colX[3], 9, { bold: true, color: [0, 0, 0] });
    drawText("Status", colX[4], 9, { bold: true, color: [0, 0, 0] });
    y -= 4;
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
    y -= rowH;

    for (const c of coaList) {
      ensureSpace();
      drawText(String(c.code), colX[0], 8);
      drawText(c.name, colX[1], 8);
      drawText(c.category, colX[2], 8);
      drawText(c.position, colX[3], 8);
      drawText(c.isActive ? "Active" : "Inactive", colX[4], 8);
      y -= rowH;
    }

    y -= 4;
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
    y -= 16;
    drawText(`Total: ${coaList.length} accounts`, margin, 10, { bold: true });

    const bytes = await doc.save();
    setPdfBytes(bytes);
  };

  const handleDownloadXLSX = () => {
    const rows = coaList.map((c) => ({
      Code: c.code,
      "Account Name": c.name,
      Description: c.description || "",
      Category: c.category,
      Position: c.position,
      Status: c.isActive ? "Active" : "Inactive",
    }));
    downloadXLSX([{ name: "Chart of Accounts", rows }], `chart-of-accounts.xlsx`);
  };

  return (
    <div className="max-w-full mx-auto space-y-4 pb-10">
      <PageHeader
        title="Chart of Accounts"
        subtitle="Manage your accounting hierarchy (assets, liabilities, equity, revenue, cogs, expense)"
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
                disabled={!coaList.length}
                className="inline-flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-40"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Excel
              </button>
            )}
            {usePermission(ROLES.ADD_COA) && (
              <Link
                href="/accounting/coa/add"
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
            placeholder="Search by code, name, description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-transparent outline-none text-sm border-r border-gray-100 dark:border-gray-800 focus:ring-0"
          />
        </div>

        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all">
          <select
            value={parentFilter}
            onChange={(e) => setParentFilter(e.target.value)}
            className="bg-transparent text-[11px] font-bold outline-none cursor-pointer min-w-[180px] text-gray-700 dark:text-gray-300"
          >
            <option value="">All Parents</option>
            {flattenCoa(coaList.filter((c) => getDepth(c, fullMapById) <= 2), null).map((c) => {
              const depth = getDepth(c, fullMapById);
              return (
                <option key={c._id} value={c._id}>
                  {"\u00A0".repeat((depth - 1) * 3)}{depth > 1 ? "↳ " : ""}{c.code} – {c.name}
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
            <option value="false">Inactive</option>
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
                  <th className="lg:w-32 w-16 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Code</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Account Name</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Category</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Pos</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                {filtered.map((c) => {
                  const depth = getDepth(c, fullMapById);
                  const maxDepth = 5;
                  const indent = Math.max(0, maxDepth - depth) * 1;

                  return (
                    <tr key={c._id} className="group hover:bg-indigo-50/40 dark:hover:bg-indigo-500/5 transition-all cursor-pointer">
                      {/* Code */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center" style={{ paddingLeft: `${indent}rem` }}>
                          <span className={`font-mono font-medium text-xs ${
                            depth === 1
                              ? "text-gray-900 dark:text-white font-bold"
                              : "text-gray-600 dark:text-gray-300"
                          }`}>
                            {c.code}
                          </span>
                        </div>
                      </td>

                      {/* Name + actions (bottom, on hover) */}
                      <td className="px-4 py-3 relative group-hover:pb-8 transition-all duration-200">
                        <div>
                          <p className={`font-medium ${
                            depth === 1
                              ? "text-gray-900 dark:text-white font-bold text-sm"
                              : "text-gray-700 dark:text-gray-300 text-xs"
                          }`}>
                            {c.name}
                          </p>
                          {c.description && (
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 line-clamp-1 mt-0.5">
                              {c.description}
                            </p>
                          )}
                        </div>
                        <div className="absolute bottom-1.5 left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          {canEditCoa && (
                            <Link
                              href={`/accounting/coa/edit/${c._id}`}
                              className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 text-[10px] font-black uppercase tracking-wider"
                            >
                              Edit
                            </Link>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${categoryColors[c.category] || ""}`}>
                          {c.category}
                        </span>
                      </td>

                      {/* Position */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${positionStyles[c.position] || ""}`}>
                          {c.position}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {c.isActive ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Inactive
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
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Chart of Accounts PDF</h3>
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
