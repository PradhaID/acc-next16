"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

interface Notification {
  _id: string;
  type: "INFO" | "WARN" | "SUCCESS" | "ERROR";
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  time: string;
}

const TYPE_STYLES: Record<string, { dot: string; bg: string }> = {
  SUCCESS: { dot: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  ERROR: { dot: "bg-red-500", bg: "bg-red-50 dark:bg-red-950/30" },
  WARN: { dot: "bg-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30" },
  INFO: { dot: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
};

export default function NotificationBell({ dropdownUp }: { dropdownUp?: boolean }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/system/notifications");
      if (res.ok) {
        const json = await res.json();
        setNotifications(json.data);
        setUnreadCount(json.unreadCount);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleMarkAllRead = async () => {
    await fetch("/api/system/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleMarkRead = async (id: string) => {
    await fetch("/api/system/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: id }),
    });
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const timeAgo = (time: string) => {
    const diff = Math.floor((Date.now() - new Date(time).getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-white/[0.06] dark:hover:text-zinc-300 transition-all"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className={`absolute left-0 ${dropdownUp ? "bottom-full mb-2" : "top-full mt-2"} w-80 rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-white/[0.08] dark:bg-zinc-900 overflow-hidden z-[9999]`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-white/[0.06]">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-[10px] font-bold text-orange-600 hover:underline">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-zinc-100 dark:divide-white/[0.06]">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-zinc-400">No notifications yet</div>
            ) : (
              notifications.map((n) => {
                const style = TYPE_STYLES[n.type] || TYPE_STYLES.INFO;
                const content = (
                  <div
                    className={`flex items-start gap-3 px-4 py-3 transition-all hover:bg-zinc-50 dark:hover:bg-white/[0.03] ${n.read ? "opacity-60" : ""}`}
                    onClick={() => !n.read && handleMarkRead(n._id)}
                  >
                    <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{n.title}</p>
                      {n.message && <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2">{n.message}</p>}
                      <p className="text-[10px] text-zinc-400 mt-1">{timeAgo(n.time)}</p>
                    </div>
                  </div>
                );

                if (n.link && !n.read) {
                  return <Link key={n._id} href={n.link} onClick={() => handleMarkRead(n._id)}>{content}</Link>;
                }
                return <div key={n._id}>{content}</div>;
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
