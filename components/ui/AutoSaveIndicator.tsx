"use client";

import { useState, useEffect } from "react";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface AutoSaveIndicatorProps {
  status: SaveStatus;
  lastSaved?: number | null;
  errorMessage?: string;
}

export default function AutoSaveIndicator({ status, lastSaved, errorMessage }: AutoSaveIndicatorProps) {
  const [timeAgo, setTimeAgo] = useState<string>("");

  useEffect(() => {
    if (!lastSaved) {
      setTimeAgo("");
      return;
    }
    const update = () => {
      const diff = Math.floor((Date.now() - lastSaved) / 1000);
      if (diff < 5) setTimeAgo("just now");
      else if (diff < 60) setTimeAgo(`${diff}s ago`);
      else if (diff < 3600) setTimeAgo(`${Math.floor(diff / 60)}m ago`);
      else setTimeAgo(`${Math.floor(diff / 3600)}h ago`);
    };
    update();
    const interval = setInterval(update, 10000);
    return () => clearInterval(interval);
  }, [lastSaved]);

  if (status === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Saving...
      </span>
    );
  }

  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400" title={errorMessage}>
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        Save failed
      </span>
    );
  }

  if (status === "saved" && lastSaved) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Saved {timeAgo}
      </span>
    );
  }

  return null;
}
