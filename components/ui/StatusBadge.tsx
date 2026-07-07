"use client";

interface StatusBadgeProps {
  status: string;
}

const styles: Record<string, string> = {
  Pending:
    "bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-400",
  Confirmed:
    "bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400",
  Rejected:
    "bg-red-50 border-red-100 text-red-600 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400",
  Reversed:
    "bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-400",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border ${styles[status] || styles.Pending}`}
    >
      {status}
    </span>
  );
}
