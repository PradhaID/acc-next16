"use client";

import type { ReactNode } from "react";

interface FormFieldProps {
  label: string;
  error?: string;
  children: ReactNode;
  required?: boolean;
}

export default function FormField({ label, error, children, required }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-red-500 dark:text-red-400 ml-1">{error}</p>
      )}
    </div>
  );
}
