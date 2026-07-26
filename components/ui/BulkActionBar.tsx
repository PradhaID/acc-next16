"use client";

import { useState } from "react";

interface BulkAction {
  label: string;
  action: string;
  variant?: "primary" | "danger" | "warning";
  confirm?: string;
}

interface BulkActionBarProps {
  count: number;
  actions: BulkAction[];
  onAction: (action: string) => Promise<void>;
  onClear: () => void;
}

export default function BulkActionBar({ count, actions, onAction, onClear }: BulkActionBarProps) {
  const [pending, setPending] = useState(false);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  if (count === 0) return null;

  const handleAction = async (action: string, confirm?: string) => {
    if (confirm && confirmAction !== action) {
      setConfirmAction(action);
      return;
    }
    setConfirmAction(null);
    setPending(true);
    try {
      await onAction(action);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="sticky bottom-4 z-20 flex items-center justify-between gap-4 bg-white dark:bg-stone-900/80 border border-emerald-200 dark:border-emerald-800 rounded-2xl shadow-lg px-5 py-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
          {count} selected
        </span>
        <button
          onClick={onClear}
          disabled={pending}
          className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-medium underline underline-offset-2"
        >
          Clear
        </button>
      </div>
      <div className="flex items-center gap-2">
        {actions.map((a) => {
          const isConfirming = confirmAction === a.action;
          return (
            <button
              key={a.action}
              onClick={() => handleAction(a.action, a.confirm)}
              disabled={pending}
              className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all disabled:opacity-50 ${
                a.variant === "danger"
                  ? isConfirming
                    ? "bg-red-600 text-white"
                    : "bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400"
                  : a.variant === "warning"
                    ? isConfirming
                      ? "bg-emerald-600 text-white"
                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400"
              }`}
            >
              {pending ? "..." : isConfirming ? `Sure?` : a.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
