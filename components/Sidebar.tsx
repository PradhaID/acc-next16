"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "@/components/ui/ThemeToggle";
import NotificationBell from "@/components/ui/NotificationBell";
import { useT } from "@/components/LanguageProvider";
import { clearSessionCache } from "@/hooks/useSession";
import { useSettings } from "@/lib/settings-context";

interface NavItem {
  labelKey: string;
  href: string;
  icon: React.ReactNode;
  roleUrl?: string;
  subItems?: { labelKey: string; href: string; roleUrl?: string }[];
}

const navItems: NavItem[] = [
  {
    labelKey: "nav.dashboard",
    href: "/dashboard",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955a1.126 1.126 0 0 1 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
    roleUrl: "/dashboard",
    subItems: [
      { labelKey: "nav.overview", href: "/dashboard", roleUrl: "/dashboard" },
      { labelKey: "nav.analytics", href: "/dashboard/analytics", roleUrl: "/dashboard/analytics" },
      { labelKey: "nav.systemReport", href: "/dashboard/system", roleUrl: "/dashboard/system" },
      { labelKey: "nav.userGroupReport", href: "/dashboard/user-group", roleUrl: "/dashboard/user-group" },
    ],
  },
  {
    labelKey: "nav.content",
    href: "/content",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18V6a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 6v3.75m-18 0A2.25 2.25 0 0 0 5.25 12h13.5M3 9.75h18" />
      </svg>
    ),
    roleUrl: "/content",
    subItems: [
      { labelKey: "nav.posts", href: "/content/post", roleUrl: "/content/post" },
      { labelKey: "nav.pages", href: "/content/page", roleUrl: "/content/page" },
      { labelKey: "nav.categories", href: "/content/category", roleUrl: "/content/category" },
      { labelKey: "nav.media", href: "/content/media", roleUrl: "/content/media" },
      { labelKey: "nav.ads", href: "/content/ad", roleUrl: "/content/ad" },
    ],
  },
  {
    labelKey: "nav.accounting",
    href: "/accounting",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    roleUrl: "/accounting",
    subItems: [
      { labelKey: "nav.coa", href: "/accounting/coa", roleUrl: "/accounting/coa" },
      { labelKey: "nav.accountList", href: "/accounting/account", roleUrl: "/accounting/account" },
      { labelKey: "nav.transactions", href: "/accounting/transaction", roleUrl: "/accounting/transaction" },
      { labelKey: "nav.ledger", href: "/accounting/ledger", roleUrl: "/accounting/ledger" },
      { labelKey: "nav.balanceSheet", href: "/accounting/balance-sheet", roleUrl: "/accounting/balance-sheet" },
      { labelKey: "nav.incomeStatement", href: "/accounting/income-statement", roleUrl: "/accounting/income-statement" },
      { labelKey: "nav.closing", href: "/accounting/closing", roleUrl: "/accounting/closing" },
    ],
  },
  {
    labelKey: "nav.system",
    href: "/system",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
    roleUrl: "/system",
    subItems: [
      { labelKey: "nav.users", href: "/system/users", roleUrl: "/system/users" },
      { labelKey: "nav.groups", href: "/system/group", roleUrl: "/system/group" },
      { labelKey: "nav.logs", href: "/system/logs", roleUrl: "/system/logs" },
      { labelKey: "nav.redirects", href: "/system/redirects", roleUrl: "/system/redirects" },
      { labelKey: "nav.settings", href: "/system/settings", roleUrl: "/system/settings" },
    ],
  },
];

interface SidebarProps {
  user: {
    username: string;
    fullName: string;
    email: string;
    image?: string | null;
    roleUrls: string[];
  };
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const settings = useSettings();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    const isMobile = window.innerWidth < 768;
    if (isMobile) return false;
    const saved = localStorage.getItem("sidebarCollapsed");
    if (saved !== null) return saved === "true";
    return window.innerWidth >= 768 && window.innerWidth < 1024;
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownTop, setDropdownTop] = useState(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        setCollapsed(false);
        return;
      }
      if (window.innerWidth >= 768 && window.innerWidth < 1024) {
        setCollapsed(true);
        localStorage.setItem("sidebarCollapsed", "true");
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      localStorage.setItem("sidebarCollapsed", String(collapsed));
    }
  }, [collapsed]);

  useEffect(() => {
    const handleClickOutside = () => { setOpenDropdown(null); setUserMenuOpen(false); };
    if (openDropdown || userMenuOpen) document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [openDropdown, userMenuOpen]);

  useEffect(() => {
    navItems.forEach((item) => {
      if (item.subItems) {
        const isActive = item.subItems.some(
          (sub) => pathname === sub.href || pathname.startsWith(sub.href + "/")
        );
        if (isActive) {
          setExpandedMenus((prev) => new Set(prev).add(item.href));
        }
      }
    });
  }, [pathname]);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
    setOpenDropdown(null);
  }, []);

  const handleLogout = async () => {
    clearSessionCache();
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/account/signin");
  };

  const toggleMenu = (href: string) => {
    setExpandedMenus((prev) => {
      const next = new Set(prev);
      if (next.has(href)) next.delete(href);
      else next.add(href);
      return next;
    });
  };

  const userRoleUrls = user.roleUrls || [];

  const hasRoleUrl = (prefix: string) => userRoleUrls.some((url: string) => url === prefix || url.startsWith(prefix + "/"));

  const visibleItems = navItems.filter((item) => {
    if (item.subItems) {
      return item.subItems.some(
        (sub) => !sub.roleUrl || hasRoleUrl(sub.roleUrl)
      );
    }
    return !item.roleUrl || hasRoleUrl(item.roleUrl);
  });

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={closeMobile}
        />
      )}

      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-white shadow-sm md:hidden dark:border-white/[0.08] dark:bg-zinc-900"
        aria-label="Open sidebar"
      >
        <svg className="h-5 w-5 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      <aside
        className={`
          fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-zinc-200 bg-white transition-all duration-300
          dark:border-white/[0.08] dark:bg-zinc-900

          md:sticky md:top-0 md:self-start md:translate-x-0
          ${collapsed ? "md:w-16" : "md:w-64"}

          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          w-64
        `}
      >
        <div className={`flex items-center justify-between border-b border-zinc-200 py-4 dark:border-white/[0.08] ${collapsed ? "md:justify-center md:px-0" : "px-4"}`}>
          <Link href="/" className="flex items-center">
            <img src="/img/logo.webp" alt="Logo" width="32" height="32" className="h-8 w-8 rounded-lg object-contain shrink-0" />
            {!collapsed && <span className="ml-3 text-sm font-bold text-stone-900 dark:text-white">{settings.app_name || process.env.NEXT_PUBLIC_APP_NAME || "Pradha Finance"}</span>}
          </Link>
          {!collapsed && (
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <NotificationBell />
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {visibleItems.map((item) => {
            const isActive = item.subItems
              ? item.subItems.some(
                  (sub) => pathname === sub.href || pathname.startsWith(sub.href + "/")
                )
              : pathname === item.href;
            const isExpanded = expandedMenus.has(item.href);

            if (item.subItems) {
              const dropdownOpen = collapsed && openDropdown === item.href;
              return (
                <div key={item.href} className="relative">
                  <button
                    onClick={(e) => {
                      if (collapsed) {
                        e.stopPropagation();
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setDropdownTop(rect.top);
                        setOpenDropdown(dropdownOpen ? null : item.href);
                      } else {
                        toggleMenu(item.href);
                      }
                    }}
                    className={`flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                      collapsed ? "md:justify-center md:px-0" : ""
                    } ${
                      isActive
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                        : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.04] dark:hover:text-white"
                    }`}
                    title={collapsed ? t(item.labelKey) : undefined}
                  >
                    {item.icon}
                    {!collapsed && (
                      <>
                        <span className="ml-3 flex-1 text-left">{t(item.labelKey)}</span>
                        <svg
                          className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>
                      </>
                    )}
                  </button>
                  {!collapsed && isExpanded && (
                    <div className="ml-4 mt-1 space-y-1 border-l border-zinc-200 pl-3 dark:border-white/[0.08]">
                      {item.subItems
                        .filter(
                          (sub) => !sub.roleUrl || hasRoleUrl(sub.roleUrl)
                        )
                        .map((sub) => {
                          const subActive = pathname === sub.href || (pathname.startsWith(sub.href + "/") && sub.href !== item.href);
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              onClick={closeMobile}
                              className={`flex items-center rounded-lg px-3 py-2 text-sm transition ${
                                subActive
                                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                              }`}
                            >
                              {t(sub.labelKey)}
                            </Link>
                          );
                        })}
                    </div>
                  )}
                  {dropdownOpen && (
                    <div
                      className="fixed z-50 min-w-48 rounded-xl border border-zinc-200 bg-white py-2 shadow-lg dark:border-white/[0.08] dark:bg-zinc-900"
                      style={{ left: "68px", top: dropdownTop }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                        {t(item.labelKey)}
                      </div>
                      {item.subItems
                        .filter(
                          (sub) => !sub.roleUrl || hasRoleUrl(sub.roleUrl)
                        )
                        .map((sub) => {
                          const subActive = pathname === sub.href || (pathname.startsWith(sub.href + "/") && sub.href !== item.href);
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              onClick={() => { setOpenDropdown(null); closeMobile(); }}
                              className={`flex items-center px-4 py-2 text-sm transition ${
                                subActive
                                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.04] dark:hover:text-white"
                              }`}
                            >
                              {t(sub.labelKey)}
                            </Link>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobile}
                className={`flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  collapsed ? "md:justify-center md:px-0" : ""
                } ${
                  isActive
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.04] dark:hover:text-white"
                }`}
                title={collapsed ? t(item.labelKey) : undefined}
              >
                {item.icon}
                {!collapsed && (
                  <>
                    <span className="ml-3">{t(item.labelKey)}</span>
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="relative border-t border-zinc-200 px-4 py-4 dark:border-white/[0.08]">
          {collapsed && (
            <div className="flex flex-col items-center gap-3 mb-4">
              <NotificationBell dropdownUp />
              <ThemeToggle />
            </div>
          )}

          <div
            className="flex cursor-pointer items-center justify-between"
            onClick={(e) => { e.stopPropagation(); setUserMenuOpen(!userMenuOpen); }}
          >
            <div className="flex items-center gap-3 min-w-0">
              {user.image ? (
                <img src={user.image} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                  {(user.fullName || user.username || "?").charAt(0).toUpperCase()}
                </div>
              )}
              {!collapsed && (
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                    {user.fullName || user.username || "User"}
                  </p>
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {user.email || ""}
                  </p>
                </div>
              )}
            </div>
            {!collapsed && (
              <svg
                className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${!userMenuOpen ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            )}
          </div>

          {userMenuOpen && (
            <div
              className={`${collapsed ? "fixed z-50 min-w-40 rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-white/[0.08] dark:bg-zinc-900" : "absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-white/[0.08] dark:bg-zinc-900"}`}
              style={collapsed ? { left: "68px", bottom: "16px" } : undefined}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => { setUserMenuOpen(false); window.location.href = "/account/profile"; }}
                className="flex w-full items-center gap-3 px-4 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-white/[0.04]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
                {t("nav.profile")}
              </button>
              <button
                onClick={() => { setUserMenuOpen(false); window.location.href = "/account/password"; }}
                className="flex w-full items-center gap-3 px-4 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-white/[0.04]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
                {t("nav.password")}
              </button>
              <div className="my-1 border-t border-zinc-200 dark:border-white/[0.08]" />
              <button
                onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                </svg>
                {t("nav.signOut")}
              </button>
            </div>
          )}
        </div>
      </aside>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="fixed z-50 hidden items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-400 shadow-sm hover:text-zinc-600 dark:border-white/[0.08] dark:bg-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-300 md:flex h-6 w-6 top-4 -translate-x-1/2 transition-all duration-300"
        style={{ left: collapsed ? "4rem" : "16rem" }}
      >
        <svg
          className={`h-3 w-3 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
      </button>
    </>
  );
}
