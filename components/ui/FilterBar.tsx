"use client";

import type { ReactNode } from "react";

interface FilterBarProps {
  children: ReactNode;
}

export default function FilterBar({ children }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200/50 bg-white p-2 dark:border-white/[0.04] dark:bg-zinc-900/50">
      {children}
    </div>
  );
}
