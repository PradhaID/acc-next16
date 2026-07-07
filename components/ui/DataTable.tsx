"use client";

import type { ReactNode } from "react";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
  className?: string;
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
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="py-20 text-center">
        <svg className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 11.625l2.25-2.25M12 11.625l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
        <p className="mt-4 text-sm font-bold text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700/50 dark:bg-gray-900">
      <table className="w-full table-auto border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/50 dark:border-gray-700/50 dark:bg-gray-800/30">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 ${col.className || ""}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
          {data.map((row) => (
            <tr
              key={keyExtractor(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`transition-colors hover:bg-indigo-50/40 dark:hover:bg-indigo-500/5 ${onRowClick ? "cursor-pointer" : ""}`}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 ${col.className || ""}`}
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
