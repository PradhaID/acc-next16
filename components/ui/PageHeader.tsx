"use client";

import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string | ReactNode;
  actions?: ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          {title}
        </h1>
        {subtitle && (
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
