"use client";

import DataTable, { Column } from "@/components/ui/DataTable";

interface LogRow {
  _id: string;
  time: string;
  level: string;
  action: string;
  username: string;
  detail: string;
}

const columns: Column<LogRow>[] = [
  { key: "time", label: "Time", className: "font-mono whitespace-nowrap" },
  {
    key: "level",
    label: "Level",
    className: "w-16",
    render: (row) => (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
        row.level === "ERROR"
          ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400"
          : row.level === "WARN"
            ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400"
            : "bg-stone-50 text-stone-700 border-stone-200 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300"
      }`}>
        {row.level}
      </span>
    ),
  },
  { key: "action", label: "Action" },
  { key: "username", label: "User", hideOnMobile: true },
  { key: "detail", label: "Detail", hideOnMobile: true },
];

export default function SystemLogsTable({ logs }: { logs: LogRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={logs}
      keyExtractor={(row) => row._id}
      emptyMessage="No logs recorded yet."
    />
  );
}
