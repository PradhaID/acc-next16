import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";

async function fetchJson(url: string) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    redirect("/account/signin");
  }

  const payload = await verifyToken(token);

  if (!payload) {
    redirect("/account/signin");
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const headers = { Cookie: `session=${token}` };

  const [coas, accounts, txnsConfirmed, closingRes] = await Promise.all([
    fetchJson(`${baseUrl}/api/accounting/coa`),
    fetchJson(`${baseUrl}/api/accounting/account?all=true`),
    fetchJson(`${baseUrl}/api/accounting/transaction?status=Confirmed`),
    fetchJson(`${baseUrl}/api/accounting/balance-sheet`),
  ]);

  const coaCount = Array.isArray(coas) ? coas.length : 0;
  const accountCount = Array.isArray(accounts) ? accounts.length : 0;
  const confirmedCount = Array.isArray(txnsConfirmed) ? txnsConfirmed.length : 0;

  const totalAssets = closingRes?.totalAssets ?? 0;
  const totalLiabilities = closingRes?.totalLiabilities ?? 0;
  const totalEquity = closingRes?.totalEquity ?? 0;

  const stats = [
    {
      label: "Chart of Accounts",
      value: coaCount,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
        </svg>
      ),
      color: "text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-500/10",
    },
    {
      label: "Accounts",
      value: accountCount,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 0 4.5 6h.75m13.5 0h.75a.75.75 0 0 0 .75-.75V4.5m0 0v-.75a.75.75 0 0 0-.75-.75h-.75M3.75 4.5h-.75a.75.75 0 0 0-.75.75V6m18 10.5v-9a2.25 2.25 0 0 0-2.25-2.25H4.5A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25h15a2.25 2.25 0 0 0 2.25-2.25Z" />
        </svg>
      ),
      color: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10",
    },
    {
      label: "Confirmed Transactions",
      value: confirmedCount,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
      color: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10",
    },
  ];

  const financialStats = [
    { label: "Total Assets", value: totalAssets, color: "text-sky-600" },
    { label: "Total Liabilities", value: totalLiabilities, color: "text-orange-600" },
    { label: "Total Equity", value: totalEquity, color: "text-violet-600" },
  ];

  return (
    <div className="max-w-full mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">
          Welcome, {payload.fullName}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Here&apos;s an overview of your accounting data.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm">
            <div className="flex items-center gap-4">
              <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${stat.color}`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{stat.label}</p>
                <p className="text-3xl font-black text-gray-900 dark:text-white mt-0.5">
                  {stat.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm">
        <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Balance Snapshot</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {financialStats.map((stat) => (
            <div key={stat.label}>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{stat.label}</p>
              <p className={`text-xl font-black mt-0.5 font-mono ${stat.color}`}>
                {formatCurrency(stat.value)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
