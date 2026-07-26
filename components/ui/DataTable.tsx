"use client";

import type { ReactNode } from "react";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export default function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyMessage = "No data found.",
  onRowClick,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="py-12 text-center">
        <svg className="mx-auto h-10 w-10 text-stone-300 dark:text-stone-700" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 11.625l2.25-2.25M12 11.625l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
        <p className="mt-3 text-xs font-bold text-stone-400 dark:text-stone-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-700/50 dark:bg-stone-900/80">
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-stone-200 bg-stone-50/80 dark:border-stone-700/50 dark:bg-stone-800/40">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest text-stone-500 whitespace-nowrap ${col.hideOnMobile ? "hidden md:table-cell" : ""} ${col.className || ""}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-200 dark:divide-stone-700/30">
          {data.map((row) => (
            <tr
              key={keyExtractor(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`transition-colors hover:bg-stone-100 dark:hover:bg-stone-800/40 ${onRowClick ? "cursor-pointer" : ""}`}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-3 py-2 font-medium text-stone-700 dark:text-stone-300 ${col.hideOnMobile ? "hidden md:table-cell" : ""} ${col.className || ""}`}
                >
                  {col.render
                    ? col.render(row)
                    : (row as Record<string, unknown>)[col.key] as ReactNode}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
