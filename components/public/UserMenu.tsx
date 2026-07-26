"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { clearSessionCache } from "@/hooks/useSession";

interface UserMenuProps {
  fullName: string;
  username: string;
  email: string;
  image: string | null;
}

export default function UserMenu({ fullName, username, email, image }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [open]);

  const handleLogout = async () => {
    clearSessionCache();
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden border border-orange-200/50 dark:border-orange-800/30 shadow-sm cursor-pointer transition hover:shadow-md"
        title={fullName || username}
      >
        {image ? (
          <img src={image} alt="" className="h-10 w-10 rounded-xl object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 font-bold text-sm">
            {(fullName || username || "?").charAt(0).toUpperCase()}
          </div>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-[9999] mt-2 min-w-[220px] rounded-xl border border-zinc-200 bg-white py-1 shadow-xl dark:border-white/[0.08] dark:bg-zinc-900"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-2 border-b border-zinc-100 dark:border-white/[0.06]">
            <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{fullName || username}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{email}</p>
          </div>
          <button
            onClick={() => { setOpen(false); router.push("/account/profile"); }}
            className="flex w-full items-center gap-3 px-4 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-white/[0.04]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            Profile
          </button>
          <button
            onClick={() => { setOpen(false); router.push("/account/password"); }}
            className="flex w-full items-center gap-3 px-4 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-white/[0.04]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            Change Password
          </button>
          <div className="my-1 border-t border-zinc-100 dark:border-white/[0.06]" />
          <button
            onClick={() => { setOpen(false); handleLogout(); }}
            className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
            </svg>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
