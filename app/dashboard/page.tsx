import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { formatNumber } from "@/lib/format";
import { getDb } from "@/lib/mongodb";
import Link from "next/link";
import type { SystemLog } from "@/lib/models/system/log";
import { formatRelativeTime } from "@/lib/time";
import { hasAccess } from "@/lib/role-check";
import { getDictionary, translate } from "@/lib/i18n";

async function getMonthlyAssets(db: any, endOfDate: Date) {
  const rows = await db
    .collection("accountingTransactionDetails")
    .aggregate([
      {
        $lookup: {
          from: "accountingTransactions",
          localField: "transaction",
          foreignField: "_id",
          as: "txn",
        },
      },
      { $unwind: "$txn" },
      { $match: { "txn.status": "Confirmed", "txn.effectiveDate": { $lte: endOfDate } } },
      {
        $lookup: {
          from: "accountingAccounts",
          localField: "account",
          foreignField: "_id",
          as: "acc",
        },
      },
      { $unwind: "$acc" },
      {
        $lookup: {
          from: "accountingCoa",
          localField: "acc.coa",
          foreignField: "_id",
          as: "coa",
        },
      },
      { $unwind: "$coa" },
      { $match: { "coa.category": "Asset" } },
      {
        $group: {
          _id: null,
          totalDb: { $sum: { $cond: [{ $eq: ["$position", "Db"] }, "$amount", 0] } },
          totalCr: { $sum: { $cond: [{ $eq: ["$position", "Cr"] }, "$amount", 0] } },
        },
      },
    ])
    .toArray();

  if (rows.length > 0) {
    return rows[0].totalDb - rows[0].totalCr;
  }
  return 0;
}

function getActivityIcon(category: string, action: string) {
  const iconClass = "w-4 h-4";

  switch (category) {
    case "AUTH":
      if (action === "LOGIN" || action === "LOGIN_FAILED") {
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
          </svg>
        );
      }
      if (action === "REGISTER") {
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3M2.25 12a9.75 9.75 0 1 1 19.5 0 9.75 9.75 0 0 1-19.5 0Z" />
          </svg>
        );
      }
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
      );

    case "USER":
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
      );

    case "GROUP":
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.97 5.97 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
        </svg>
      );

    case "CONTENT":
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18V6a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 6v3.75m-18 0A2.25 2.25 0 0 0 5.25 12h13.5M3 9.75h18" />
        </svg>
      );

    case "SETTINGS":
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c-.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      );

    case "REDIRECT":
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
      );

    default:
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
        </svg>
      );
  }
}

function getActivityColor(category: string, level: string) {
  if (level === "ERROR") return "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-800/50";
  if (level === "WARN") return "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-800/50";

  switch (category) {
    case "AUTH":
      return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50";
    case "USER":
      return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50";
    case "GROUP":
      return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50";
    case "CONTENT":
      return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50";
    case "SETTINGS":
      return "bg-stone-100 text-stone-600 dark:bg-stone-500/10 dark:text-stone-400 border-stone-200 dark:border-stone-700/50";
    case "REDIRECT":
      return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50";
    default:
      return "bg-stone-100 text-stone-600 dark:bg-stone-500/10 dark:text-stone-400 border-stone-200 dark:border-stone-700/50";
  }
}

function formatActionLabel(action: string): string {
  return action
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
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

  const roleUrls = payload.roleUrls || [];
  const dict = getDictionary(payload.language);
  const t = (path: string) => translate(dict, path);

  let coaCount = 0;
  let accountCount = 0;
  let confirmedCount = 0;
  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;
  let grossProfitLessExpense = 0;

  let userCount = 0;
  let groupCount = 0;
  let recentLogs: SystemLog[] = [];
  let activeSessionsCount = 0;
  
  // Chart points for Monthly Revenue, COGS, and Expense
  let chartDataPoints: { label: string; revenue: number; cogs: number; expense: number }[] = [];
  // Chart points for Monthly Assets
  let assetPoints: { label: string; assets: number }[] = [];

  try {
    const db = await getDb();

    coaCount = await db.collection("accountingCoa").countDocuments();
    accountCount = await db.collection("accountingAccounts").countDocuments();
    confirmedCount = await db.collection("accountingTransactions").countDocuments({ status: "Confirmed" });

    const accountsData = await db.collection("accountingAccounts").find({ isActive: true }).toArray();
    const coasData = await db.collection("accountingCoa").find({ category: { $in: ["Asset", "Liability", "Equity"] } }).toArray();
    const coaMap = new Map(coasData.map(c => [c._id.toHexString(), c]));

    // Query Revenue, COGS, and Expenses
    const netIncomeRows = await db
      .collection("accountingTransactionDetails")
      .aggregate([
        {
          $lookup: {
            from: "accountingTransactions",
            localField: "transaction",
            foreignField: "_id",
            as: "txn",
          },
        },
        { $unwind: "$txn" },
        { $match: { "txn.status": "Confirmed" } },
        {
          $lookup: {
            from: "accountingAccounts",
            localField: "account",
            foreignField: "_id",
            as: "acc",
          },
        },
        { $unwind: "$acc" },
        {
          $lookup: {
            from: "accountingCoa",
            localField: "acc.coa",
            foreignField: "_id",
            as: "coa",
          },
        },
        { $unwind: "$coa" },
        { $match: { "coa.category": { $in: ["Revenue", "COGS", "Expense"] } } },
        {
          $group: {
            _id: "$coa.category",
            totalDb: { $sum: { $cond: [{ $eq: ["$position", "Db"] }, "$amount", 0] } },
            totalCr: { $sum: { $cond: [{ $eq: ["$position", "Cr"] }, "$amount", 0] } },
          },
        },
      ])
      .toArray();

    let revenueTotal = 0;
    let cogsTotal = 0;
    let expenseTotal = 0;

    for (const r of netIncomeRows) {
      if (r._id === "Revenue") {
        revenueTotal = r.totalCr - r.totalDb;
      } else if (r._id === "COGS") {
        cogsTotal = r.totalDb - r.totalCr;
      } else if (r._id === "Expense") {
        expenseTotal = r.totalDb - r.totalCr;
      }
    }

    grossProfitLessExpense = (revenueTotal - cogsTotal) - expenseTotal;

    for (const acc of accountsData) {
      const coaId = acc.coa?.toString();
      const coa = coaMap.get(coaId);
      if (!coa) continue;
      
      const balance = acc.balance || 0;
      if (coa.category === "Asset") {
        totalAssets += balance;
      } else if (coa.category === "Liability") {
        totalLiabilities += balance;
      } else if (coa.category === "Equity") {
        totalEquity += balance;
      }
    }
    
    // Add net income to equity total
    totalEquity += grossProfitLessExpense;

    // 3. User & Group data
    userCount = await db.collection("systemUsers").countDocuments();
    groupCount = await db.collection("systemGroups").countDocuments();

    recentLogs = await db
      .collection<SystemLog>("systemLogs")
      .find({})
      .sort({ "created.at": -1 })
      .limit(10)
      .toArray();

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    activeSessionsCount = await db
      .collection("systemLogs")
      .countDocuments({
        action: "LOGIN",
        "created.at": { $gte: oneDayAgo },
      });

    // 4. Monthly analytics for line chart (Last 6 Months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0,0,0,0);

    const monthlyStatsRows = await db
      .collection("accountingTransactionDetails")
      .aggregate([
        {
          $lookup: {
            from: "accountingTransactions",
            localField: "transaction",
            foreignField: "_id",
            as: "txn",
          },
        },
        { $unwind: "$txn" },
        { $match: { "txn.status": "Confirmed", "txn.effectiveDate": { $gte: sixMonthsAgo } } },
        {
          $lookup: {
            from: "accountingAccounts",
            localField: "account",
            foreignField: "_id",
            as: "acc",
          },
        },
        { $unwind: "$acc" },
        {
          $lookup: {
            from: "accountingCoa",
            localField: "acc.coa",
            foreignField: "_id",
            as: "coa",
          },
        },
        { $unwind: "$coa" },
        { $match: { "coa.category": { $in: ["Revenue", "COGS", "Expense"] } } },
        {
          $group: {
            _id: {
              year: { $year: "$txn.effectiveDate" },
              month: { $month: "$txn.effectiveDate" },
              category: "$coa.category"
            },
            totalDb: { $sum: { $cond: [{ $eq: ["$position", "Db"] }, "$amount", 0] } },
            totalCr: { $sum: { $cond: [{ $eq: ["$position", "Cr"] }, "$amount", 0] } },
          },
        },
      ])
      .toArray();

    const monthsList: { year: number; month: number; label: string }[] = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      monthsList.push({
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        label: `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`
      });
    }

    chartDataPoints = monthsList.map((m) => {
      let revenue = 0;
      let cogs = 0;
      let expense = 0;

      for (const row of monthlyStatsRows) {
        if (row._id.year === m.year && row._id.month === m.month) {
          if (row._id.category === "Revenue") {
            revenue = Math.max(0, row.totalCr - row.totalDb);
          } else if (row._id.category === "COGS") {
            cogs = Math.max(0, row.totalDb - row.totalCr);
          } else if (row._id.category === "Expense") {
            expense = Math.max(0, row.totalDb - row.totalCr);
          }
        }
      }

      return { label: m.label, revenue, cogs, expense };
    });

    // 5. Query monthly total assets historically for the same months
    for (const m of monthsList) {
      const endOfDate = new Date(m.year, m.month, 0, 23, 59, 59, 999);
      const assetsVal = await getMonthlyAssets(db, endOfDate);
      assetPoints.push({
        label: m.label,
        assets: Math.max(0, assetsVal),
      });
    }

  } catch (error) {
    console.error("Dashboard DB direct query error:", error);
  }

  const financeStats = [
    {
      label: "Chart of Accounts",
      value: coaCount,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
        </svg>
      ),
      color: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10",
      description: "Standard bookkeeping codes",
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
      description: "Financial ledger accounts",
    },
    {
      label: "Confirmed Transactions",
      value: confirmedCount,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
      color: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10",
      description: "Verified journal postings",
    },
  ];

  const systemStats = [
    {
      label: "System Users",
      labelKey: "dashboard.stats.users",
      value: userCount,
      description: "Registered accounts",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.947 11.947 0 0 1 12 20.25a11.947 11.947 0 0 1-3-1.013v-.11c0-1.112-.285-2.16-.786-3.07M12 19.125v-.003c0-1.113-.285-2.16-.786-3.07M12 19.125A12.134 12.134 0 0 0 14.25 15m0 0a8.961 8.961 0 0 0 3-2.924M14.25 15a8.961 8.961 0 0 1-3-2.924M11.25 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM18.6 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM12 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      ),
      color: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10",
    },
    {
      label: "Active Groups",
      labelKey: "dashboard.stats.groups",
      value: groupCount,
      description: "Permission groupings",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.97 5.97 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
        </svg>
      ),
      color: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10",
    },
    {
      label: "Active Sessions",
      labelKey: "dashboard.stats.sessions",
      value: activeSessionsCount,
      description: "Logins in last 24h",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      ),
      color: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10",
    },
  ];

  const balanceStats = [
    { label: "Total Assets", value: totalAssets },
    { label: "Total Liabilities", value: totalLiabilities },
    { label: "Total Equity", value: totalEquity },
  ];

  // SVG Line Chart calculation configurations
  const svgWidth = 500;
  const svgHeight = 220;
  const chartWidth = svgWidth - 80;
  const chartHeight = svgHeight - 60;
  const xOffset = 60;
  const yOffset = 20;

  // 1. Assets Chart Coordinates Calculation
  const maxAssetsVal = Math.max(...assetPoints.map(p => p.assets), 1000);
  const getAssetCoordinates = (index: number, val: number) => {
    const x = xOffset + (index / 5) * chartWidth;
    const y = yOffset + chartHeight - (val / maxAssetsVal) * chartHeight;
    return { x, y };
  };
  const getAssetPathD = () => {
    if (assetPoints.length === 0) return "";
    return assetPoints.map((point, index) => {
      const { x, y } = getAssetCoordinates(index, point.assets);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    }).join(" ");
  };

  // 2. Financial Chart Coordinates Calculation
  const maxFinanceVal = Math.max(
    ...chartDataPoints.map(p => Math.max(p.revenue, p.cogs, p.expense)),
    1000
  );
  const getFinanceCoordinates = (index: number, val: number) => {
    const x = xOffset + (index / 5) * chartWidth;
    const y = yOffset + chartHeight - (val / maxFinanceVal) * chartHeight;
    return { x, y };
  };
  const getFinancePathD = (dataKey: "revenue" | "cogs" | "expense") => {
    if (chartDataPoints.length === 0) return "";
    return chartDataPoints.map((point, index) => {
      const { x, y } = getFinanceCoordinates(index, point[dataKey]);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    }).join(" ");
  };

  const isNetNegative = grossProfitLessExpense < 0;

  return (
    <div className="max-w-full mx-auto space-y-8 pb-10 overflow-hidden">
      {/* Interactive Dot Hover Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .graph-dot {
          transition: all 0.15s ease-in-out;
          cursor: pointer;
        }
        .graph-dot:hover {
          r: 7px !important;
          stroke-width: 3px !important;
        }
      `}} />

      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white">
          Welcome, {payload.fullName}
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Here is a unified overview of your system reports and financial statements.
        </p>
      </div>

      {/* Financial Reports Summary Stats */}
      <div className="space-y-4">
        <h2 className="text-xs font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">Financial Reports Overview</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {financeStats.map((stat) => (
            <div key={stat.label} className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-700/50 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-4">
                <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${stat.color}`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">{stat.label}</p>
                  <p className="text-3xl font-black text-stone-900 dark:text-white mt-0.5">
                    {stat.value}
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-stone-500 mt-3">{stat.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Balance Snapshot */}
      <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-700/50 shadow-sm space-y-6">
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-4">Balance Sheet Snapshot</h2>
          <div className="grid gap-6 sm:grid-cols-4">
            {balanceStats.map((stat) => (
              <div key={stat.label} className="border-l-4 border-emerald-500 pl-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">{stat.label}</p>
                <p className="text-2xl font-black mt-1 font-mono text-stone-850 dark:text-stone-100">
                  {formatNumber(stat.value)}
                </p>
              </div>
            ))}
            <div className="border-l-4 border-emerald-600 pl-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Gross Profit — Total Expenses</p>
              <p className={`text-2xl font-black mt-1 font-mono ${isNetNegative ? "text-red-500 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                {formatNumber(grossProfitLessExpense)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Dual Graphs Column Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Side: Monthly Total Assets Graph */}
        {assetPoints.length > 0 && (
          <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-700/50 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-stone-900 dark:text-white">Asset Valuation Trends</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Historical trend of all combined asset accounts</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <span className="w-3 h-3 rounded-full bg-emerald-600" />
                <span className="text-stone-600 dark:text-stone-300">Total Assets</span>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <div className="min-w-[450px] h-[220px]">
                <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
                  {/* Grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                    const y = yOffset + ratio * chartHeight;
                    const labelValue = ((1 - ratio) * maxAssetsVal).toFixed(0);
                    return (
                      <g key={index}>
                        <line
                          x1={xOffset}
                          y1={y}
                          x2={xOffset + chartWidth}
                          y2={y}
                          className="stroke-stone-200 dark:stroke-stone-800/80"
                          strokeWidth="1"
                          strokeDasharray="4 4"
                        />
                        <text
                          x={xOffset - 10}
                          y={y + 4}
                          textAnchor="end"
                          className="fill-stone-400 font-mono text-[10px]"
                        >
                          {labelValue}
                        </text>
                      </g>
                    );
                  })}

                  {/* X labels */}
                  {assetPoints.map((point, index) => {
                    const x = xOffset + (index / 5) * chartWidth;
                    return (
                      <text
                        key={index}
                        x={x}
                        y={yOffset + chartHeight + 20}
                        textAnchor="middle"
                        className="fill-stone-500 text-[10px] font-bold"
                      >
                        {point.label}
                      </text>
                    );
                  })}

                  {/* Assets trend line */}
                  <path
                    d={getAssetPathD()}
                    fill="none"
                    className="stroke-emerald-650"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Point dots */}
                  {assetPoints.map((point, index) => {
                    const coord = getAssetCoordinates(index, point.assets);
                    return (
                      <circle
                        key={index}
                        cx={coord.x}
                        cy={coord.y}
                        r="4"
                        className="graph-dot fill-emerald-650 stroke-white dark:stroke-stone-900"
                        strokeWidth="2"
                      >
                        <title>{point.label} Assets: {formatNumber(point.assets)}</title>
                      </circle>
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Right Side: Monthly Financial Analytics Graph */}
        {chartDataPoints.length > 0 && (
          <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-700/50 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-stone-900 dark:text-white">Revenue & Expenses</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Monthly values for Revenue, COGS, and Expenses</p>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-bold flex-wrap">
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-stone-600 dark:text-stone-300">Revenue</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-stone-600 dark:text-stone-300">COGS</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-505" />
                  <span className="text-stone-600 dark:text-stone-300">Expense</span>
                </div>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <div className="min-w-[450px] h-[220px]">
                <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
                  {/* Grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                    const y = yOffset + ratio * chartHeight;
                    const labelValue = ((1 - ratio) * maxFinanceVal).toFixed(0);
                    return (
                      <g key={index}>
                        <line
                          x1={xOffset}
                          y1={y}
                          x2={xOffset + chartWidth}
                          y2={y}
                          className="stroke-stone-200 dark:stroke-stone-800/80"
                          strokeWidth="1"
                          strokeDasharray="4 4"
                        />
                        <text
                          x={xOffset - 10}
                          y={y + 4}
                          textAnchor="end"
                          className="fill-stone-400 font-mono text-[10px]"
                        >
                          {labelValue}
                        </text>
                      </g>
                    );
                  })}

                  {/* X labels */}
                  {chartDataPoints.map((point, index) => {
                    const x = xOffset + (index / 5) * chartWidth;
                    return (
                      <text
                        key={index}
                        x={x}
                        y={yOffset + chartHeight + 20}
                        textAnchor="middle"
                        className="fill-stone-500 text-[10px] font-bold"
                      >
                        {point.label}
                      </text>
                    );
                  })}

                  {/* Revenue line (Emerald) */}
                  <path
                    d={getFinancePathD("revenue")}
                    fill="none"
                    className="stroke-emerald-500"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* COGS line (Rose) */}
                  <path
                    d={getFinancePathD("cogs")}
                    fill="none"
                    className="stroke-rose-500"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Expense line (Indigo) */}
                  <path
                    d={getFinancePathD("expense")}
                    fill="none"
                    className="stroke-indigo-505"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Point dots with title tooltips */}
                  {chartDataPoints.map((point, index) => {
                    const revCoord = getFinanceCoordinates(index, point.revenue);
                    const cogsCoord = getFinanceCoordinates(index, point.cogs);
                    const expCoord = getFinanceCoordinates(index, point.expense);
                    return (
                      <g key={index}>
                        <circle
                          cx={revCoord.x}
                          cy={revCoord.y}
                          r="4"
                          className="graph-dot fill-emerald-500 stroke-white dark:stroke-stone-900"
                          strokeWidth="2"
                        >
                          <title>{point.label} Revenue: {formatNumber(point.revenue)}</title>
                        </circle>
                        <circle
                          cx={cogsCoord.x}
                          cy={cogsCoord.y}
                          r="4"
                          className="graph-dot fill-rose-500 stroke-white dark:stroke-stone-900"
                          strokeWidth="2"
                        >
                          <title>{point.label} COGS: {formatNumber(point.cogs)}</title>
                        </circle>
                        <circle
                          cx={expCoord.x}
                          cy={expCoord.y}
                          r="4"
                          className="graph-dot fill-indigo-505 stroke-white dark:stroke-stone-900"
                          strokeWidth="2"
                        >
                          <title>{point.label} Expense: {formatNumber(point.expense)}</title>
                        </circle>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* System Stats Cards */}
      <div className="space-y-4">
        <h2 className="text-xs font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">System Activity Overview</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {systemStats.map((stat) => (
            <div key={stat.label} className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-700/50 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between gap-4 mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 truncate">{t(stat.labelKey)}</span>
                <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${stat.color} shrink-0`}>
                  {stat.icon}
                </div>
              </div>
              <div>
                <p className="text-2xl font-black text-stone-900 dark:text-white">{stat.value}</p>
                <p className="text-[10px] text-stone-500 mt-1 truncate">{stat.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-stone-900/80 p-6 rounded-2xl border border-stone-200 dark:border-stone-700/50 shadow-sm">
        <h2 className="text-xs font-black uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-4">Quick Shortcuts</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {hasAccess("/accounting/transaction/add", roleUrls) && (
            <Link
              href="/accounting/transaction/add"
              className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 dark:border-stone-700/50 hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors group"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">Add Transaction</span>
            </Link>
          )}
          {hasAccess("/accounting/coa/add", roleUrls) && (
            <Link
              href="/accounting/coa/add"
              className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 dark:border-stone-700/50 hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors group"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">New CoA Code</span>
            </Link>
          )}
          {hasAccess("/system/users/add", roleUrls) && (
            <Link
              href="/system/users/add"
              className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 dark:border-stone-700/50 hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors group"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-650 dark:text-emerald-450 group-hover:scale-110 transition-transform">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">Add User</span>
            </Link>
          )}
          {hasAccess("/system/logs", roleUrls) && (
            <Link
              href="/system/logs"
              className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 dark:border-stone-700/50 hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors group"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-650 dark:text-emerald-455 group-hover:scale-110 transition-transform">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">System Logs</span>
            </Link>
          )}
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-white dark:bg-stone-900/80 p-6 rounded-2xl border border-stone-200 dark:border-stone-700/50 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-700/50 mb-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
              <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <h2 className="text-xs font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">Activity Feed</h2>
          </div>
          {hasAccess("/system/logs", roleUrls) && (
            <Link href="/system/logs" className="text-xs font-bold text-emerald-600 hover:text-emerald-500 dark:text-emerald-455">
              View All Logs
            </Link>
          )}
        </div>

        {recentLogs.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-stone-500 dark:text-stone-400">No recent activity</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-px bg-stone-200 dark:bg-stone-700/50" />
            <div className="space-y-1">
              {recentLogs.map((log) => (
                <div key={log._id.toString()} className="relative flex items-start gap-4 py-3 px-2 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors group">
                  <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 ${getActivityColor(log.category, log.level)} shrink-0`}>
                    {getActivityIcon(log.category, log.action)}
                  </div>
                  <div className="flex-1 min-w-0 pt-1 overflow-hidden">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-stone-900 dark:text-stone-100 break-all">
                        {formatActionLabel(log.action)}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border ${getActivityColor(log.category, log.level)} shrink-0`}>
                        {log.category}
                      </span>
                    </div>
                    {log.detail && (
                      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 break-all">
                        {log.detail}
                      </p>
                    )}
                    <div className="mt-1.5 flex items-center gap-3 text-[10px] text-stone-400 dark:text-stone-500 flex-wrap">
                      <span className="font-medium break-all">@{log.username}</span>
                      <span className="shrink-0">{formatRelativeTime(log.created.at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
