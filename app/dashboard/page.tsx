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
  const iconClass = "w-3.5 h-3.5";

  switch (category) {
    case "AUTH":
      if (action === "LOGIN" || action === "LOGIN_FAILED") {
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
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
    case "USER":
    case "GROUP":
      return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50";
    case "SETTINGS":
      return "bg-stone-100 text-stone-600 dark:bg-stone-500/10 dark:text-stone-400 border-stone-200 dark:border-stone-700/50";
    default:
      return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50";
  }
}

function formatActionLabel(action: string): string {
  return action
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function formatCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${abs.toFixed(0)}`;
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
  let pendingCount = 0;
  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;
  let grossProfitLessExpense = 0;
  let revenueTotal = 0;
  let cogsTotal = 0;
  let expenseTotal = 0;

  let userCount = 0;
  let groupCount = 0;
  let recentLogs: SystemLog[] = [];
  let activeSessionsCount = 0;

  // Chart points for Monthly Revenue, COGS, and Expense
  let chartDataPoints: { label: string; revenue: number; cogs: number; expense: number }[] = [];
  // Chart points for Monthly Assets
  let assetPoints: { label: string; assets: number }[] = [];
  // Top accounts by balance
  let topAccounts: { name: string; balance: number; category: string }[] = [];
  // Monthly net income for waterfall
  let monthlyNetIncome: { label: string; value: number }[] = [];

  try {
    const db = await getDb();

    coaCount = await db.collection("accountingCoa").countDocuments();
    accountCount = await db.collection("accountingAccounts").countDocuments();
    confirmedCount = await db.collection("accountingTransactions").countDocuments({ status: "Confirmed" });
    pendingCount = await db.collection("accountingTransactions").countDocuments({ status: "Pending" });

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

    // Top 5 accounts by absolute balance
    const allCoasData = await db.collection("accountingCoa").find({}).toArray();
    const allCoaMap = new Map(allCoasData.map(c => [c._id.toHexString(), c]));
    topAccounts = accountsData
      .map(acc => {
        const coa = allCoaMap.get(acc.coa?.toString());
        return {
          name: acc.name || acc.number || "Unknown",
          balance: acc.balance || 0,
          category: coa?.category || "Unknown",
        };
      })
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
      .slice(0, 5);

    // User & Group data
    userCount = await db.collection("systemUsers").countDocuments();
    groupCount = await db.collection("systemGroups").countDocuments();

    recentLogs = await db
      .collection<SystemLog>("systemLogs")
      .find({})
      .sort({ "created.at": -1 })
      .limit(8)
      .toArray();

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    activeSessionsCount = await db
      .collection("systemLogs")
      .countDocuments({
        action: "LOGIN",
        "created.at": { $gte: oneDayAgo },
      });

    // Monthly analytics for line chart (Last 6 Months)
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

    // Monthly net income
    monthlyNetIncome = chartDataPoints.map(p => ({
      label: p.label,
      value: p.revenue - p.cogs - p.expense,
    }));

    // Query monthly total assets historically
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

  const grossProfit = revenueTotal - cogsTotal;
  const netIncomeMargin = revenueTotal > 0 ? (grossProfitLessExpense / revenueTotal) * 100 : 0;
  const grossMargin = revenueTotal > 0 ? (grossProfit / revenueTotal) * 100 : 0;
  const isNetNegative = grossProfitLessExpense < 0;

  // Prev month comparison
  const currentMonthRevenue = chartDataPoints.length >= 1 ? chartDataPoints[chartDataPoints.length - 1].revenue : 0;
  const prevMonthRevenue = chartDataPoints.length >= 2 ? chartDataPoints[chartDataPoints.length - 2].revenue : 0;
  const revenueGrowth = prevMonthRevenue > 0 ? ((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 : 0;

  // SVG Chart constants
  const svgWidth = 520;
  const svgHeight = 200;
  const chartWidth = svgWidth - 70;
  const chartHeight = svgHeight - 50;
  const xOffset = 55;
  const yOffset = 15;

  // Assets Chart
  const maxAssetsVal = Math.max(...assetPoints.map(p => p.assets), 1000);
  const getAssetCoord = (i: number, v: number) => ({
    x: xOffset + (i / Math.max(assetPoints.length - 1, 1)) * chartWidth,
    y: yOffset + chartHeight - (v / maxAssetsVal) * chartHeight,
  });
  const getAssetPathD = () =>
    assetPoints.length === 0
      ? ""
      : assetPoints.map((p, i) => {
          const { x, y } = getAssetCoord(i, p.assets);
          return `${i === 0 ? "M" : "L"} ${x} ${y}`;
        }).join(" ");
  const getAssetAreaD = () => {
    if (assetPoints.length === 0) return "";
    const baseline = yOffset + chartHeight;
    const first = getAssetCoord(0, assetPoints[0].assets);
    let d = `M ${first.x} ${baseline} L ${first.x} ${first.y}`;
    for (let i = 1; i < assetPoints.length; i++) {
      const { x, y } = getAssetCoord(i, assetPoints[i].assets);
      d += ` L ${x} ${y}`;
    }
    const last = getAssetCoord(assetPoints.length - 1, assetPoints[assetPoints.length - 1].assets);
    d += ` L ${last.x} ${baseline} Z`;
    return d;
  };

  // Finance Chart
  const maxFinanceVal = Math.max(
    ...chartDataPoints.map(p => Math.max(p.revenue, p.cogs, p.expense)),
    1000
  );
  const getFinCoord = (i: number, v: number) => ({
    x: xOffset + (i / Math.max(chartDataPoints.length - 1, 1)) * chartWidth,
    y: yOffset + chartHeight - (v / maxFinanceVal) * chartHeight,
  });
  const getFinPathD = (key: "revenue" | "cogs" | "expense") =>
    chartDataPoints.length === 0
      ? ""
      : chartDataPoints.map((p, i) => {
          const { x, y } = getFinCoord(i, p[key]);
          return `${i === 0 ? "M" : "L"} ${x} ${y}`;
        }).join(" ");
  const getFinAreaD = (key: "revenue" | "cogs" | "expense") => {
    if (chartDataPoints.length === 0) return "";
    const baseline = yOffset + chartHeight;
    const first = getFinCoord(0, chartDataPoints[0][key]);
    let d = `M ${first.x} ${baseline} L ${first.x} ${first.y}`;
    for (let i = 1; i < chartDataPoints.length; i++) {
      const { x, y } = getFinCoord(i, chartDataPoints[i][key]);
      d += ` L ${x} ${y}`;
    }
    const last = getFinCoord(chartDataPoints.length - 1, chartDataPoints[chartDataPoints.length - 1][key]);
    d += ` L ${last.x} ${baseline} Z`;
    return d;
  };

  // Net income chart
  const maxNetVal = Math.max(...monthlyNetIncome.map(p => Math.abs(p.value)), 1000);
  const netChartH = 100;
  const netMidY = 10 + netChartH / 2;

  // Balance composition for donut
  const balanceTotal = Math.abs(totalAssets) + Math.abs(totalLiabilities) + Math.abs(totalEquity);
  const assetPct = balanceTotal > 0 ? (Math.abs(totalAssets) / balanceTotal) * 100 : 33;
  const liabilityPct = balanceTotal > 0 ? (Math.abs(totalLiabilities) / balanceTotal) * 100 : 33;
  const equityPct = balanceTotal > 0 ? (Math.abs(totalEquity) / balanceTotal) * 100 : 34;

  // Donut arc calculation
  const donutR = 36;
  const donutCx = 50;
  const donutCy = 50;
  const donutStroke = 10;
  const circumference = 2 * Math.PI * donutR;

  const assetArc = (assetPct / 100) * circumference;
  const liabilityArc = (liabilityPct / 100) * circumference;
  const equityArc = (equityPct / 100) * circumference;

  const assetOffset = 0;
  const liabilityOffset = -(assetArc);
  const equityOffset = -(assetArc + liabilityArc);

  // Current time greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="max-w-full mx-auto pb-10 overflow-hidden">
      {/* Inline Styles for Interactive Elements */}
      <style dangerouslySetInnerHTML={{ __html: `
        .graph-dot {
          transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          cursor: pointer;
        }
        .graph-dot:hover {
          r: 7px !important;
          stroke-width: 3px !important;
          filter: drop-shadow(0 0 6px currentColor);
        }
        .kpi-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px -8px rgba(0, 0, 0, 0.12);
        }
        .dark .kpi-card:hover {
          box-shadow: 0 12px 40px -8px rgba(0, 0, 0, 0.4);
        }
        .stat-pulse {
          animation: statPulse 2s ease-in-out infinite;
        }
        @keyframes statPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .gradient-border {
          position: relative;
        }
        .gradient-border::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(6, 95, 70, 0.1));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
        .dark .gradient-border::before {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 95, 70, 0.05));
        }
        .area-glow {
          filter: blur(0.5px);
        }
      `}} />

      {/* ═══════════════ HEADER ═══════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-sm font-medium text-stone-400 dark:text-stone-500 mb-1">{greeting},</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white">
            {payload.fullName}
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Financial overview &amp; system health at a glance
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-stone-400 dark:text-stone-500">
          <div className="w-2 h-2 rounded-full bg-emerald-500 stat-pulse" />
          <span>Live Data</span>
          <span className="mx-1">·</span>
          <span>{new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</span>
        </div>
      </div>

      {/* ═══════════════ KPI HERO CARDS ═══════════════ */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
        {/* Total Revenue */}
        <div className="kpi-card gradient-border rounded-2xl bg-white dark:bg-stone-900/80 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15">
              <svg className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
              </svg>
            </div>
            {revenueGrowth !== 0 && (
              <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                revenueGrowth > 0
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
              }`}>
                <svg className="w-2.5 h-2.5" viewBox="0 0 20 20" fill="currentColor">
                  {revenueGrowth > 0 ? (
                    <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" transform="rotate(180 10 10)" />
                  ) : (
                    <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                  )}
                </svg>
                {Math.abs(revenueGrowth).toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-1">Total Revenue</p>
          <p className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white font-mono tabular-nums">
            {formatCompact(revenueTotal)}
          </p>
        </div>

        {/* Net Income */}
        <div className="kpi-card gradient-border rounded-2xl bg-white dark:bg-stone-900/80 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <div className={`flex items-center justify-center w-9 h-9 rounded-xl ${isNetNegative ? "bg-red-500/10 dark:bg-red-500/15" : "bg-emerald-500/10 dark:bg-emerald-500/15"}`}>
              <svg className={`w-4.5 h-4.5 ${isNetNegative ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              isNetNegative
                ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
            }`}>
              {netIncomeMargin.toFixed(1)}% margin
            </span>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-1">Net Income</p>
          <p className={`text-xl sm:text-2xl font-black font-mono tabular-nums ${isNetNegative ? "text-red-500" : "text-stone-900 dark:text-white"}`}>
            {formatCompact(grossProfitLessExpense)}
          </p>
        </div>

        {/* Total Assets */}
        <div className="kpi-card gradient-border rounded-2xl bg-white dark:bg-stone-900/80 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/10 dark:bg-blue-500/15">
              <svg className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
              </svg>
            </div>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-1">Total Assets</p>
          <p className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white font-mono tabular-nums">
            {formatCompact(totalAssets)}
          </p>
        </div>

        {/* Gross Margin */}
        <div className="kpi-card gradient-border rounded-2xl bg-white dark:bg-stone-900/80 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-violet-500/10 dark:bg-violet-500/15">
              <svg className="w-4.5 h-4.5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
              </svg>
            </div>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-1">Gross Margin</p>
          <p className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white font-mono tabular-nums">
            {grossMargin.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* ═══════════════ INCOME STATEMENT + BALANCE SHEET ═══════════════ */}
      <div className="grid gap-4 lg:grid-cols-5 mb-6">
        {/* Income Statement Summary — spans 3 cols */}
        <div className="lg:col-span-3 rounded-2xl bg-white dark:bg-stone-900/80 border border-stone-200/60 dark:border-stone-700/40 p-6">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-5">Income Statement Summary</h2>
          <div className="space-y-3">
            {/* Revenue */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-8 rounded-full bg-emerald-500" />
                <div>
                  <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">Revenue</p>
                  <p className="text-[10px] text-stone-400">Total income from operations</p>
                </div>
              </div>
              <p className="text-lg font-black font-mono text-stone-900 dark:text-white tabular-nums">
                {formatNumber(revenueTotal)}
              </p>
            </div>
            {/* COGS */}
            <div className="flex items-center justify-between py-2 border-t border-stone-100 dark:border-stone-800/60">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-8 rounded-full bg-rose-500" />
                <div>
                  <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">Cost of Goods Sold</p>
                  <p className="text-[10px] text-stone-400">Direct costs for goods/services</p>
                </div>
              </div>
              <p className="text-lg font-black font-mono text-stone-900 dark:text-white tabular-nums">
                ({formatNumber(cogsTotal)})
              </p>
            </div>
            {/* Gross Profit */}
            <div className="flex items-center justify-between py-2 border-t border-dashed border-stone-200 dark:border-stone-700/60 bg-stone-50 dark:bg-stone-800/30 -mx-6 px-6">
              <p className="text-sm font-bold text-stone-600 dark:text-stone-300">Gross Profit</p>
              <p className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatNumber(grossProfit)}
              </p>
            </div>
            {/* Expenses */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-8 rounded-full bg-indigo-500" />
                <div>
                  <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">Operating Expenses</p>
                  <p className="text-[10px] text-stone-400">All operating expenditures</p>
                </div>
              </div>
              <p className="text-lg font-black font-mono text-stone-900 dark:text-white tabular-nums">
                ({formatNumber(expenseTotal)})
              </p>
            </div>
            {/* Net Income */}
            <div className={`flex items-center justify-between py-3 border-t-2 ${isNetNegative ? "border-red-300 dark:border-red-800/60" : "border-emerald-300 dark:border-emerald-800/60"} -mx-6 px-6 rounded-b-xl ${
              isNetNegative ? "bg-red-50/50 dark:bg-red-950/20" : "bg-emerald-50/50 dark:bg-emerald-950/20"
            }`}>
              <p className="text-sm font-black text-stone-900 dark:text-white">Net Income</p>
              <p className={`text-xl font-black font-mono tabular-nums ${isNetNegative ? "text-red-500 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                {formatNumber(grossProfitLessExpense)}
              </p>
            </div>
          </div>
        </div>

        {/* Balance Sheet Composition — spans 2 cols */}
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-stone-900/80 border border-stone-200/60 dark:border-stone-700/40 p-6">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-5">Balance Sheet</h2>

          {/* Donut Chart */}
          <div className="flex items-center justify-center mb-5">
            <svg width="100" height="100" viewBox="0 0 100 100" className="transform -rotate-90">
              <circle cx={donutCx} cy={donutCy} r={donutR} fill="none" className="stroke-stone-100 dark:stroke-stone-800" strokeWidth={donutStroke} />
              <circle
                cx={donutCx} cy={donutCy} r={donutR}
                fill="none"
                className="stroke-emerald-500"
                strokeWidth={donutStroke}
                strokeDasharray={`${assetArc} ${circumference - assetArc}`}
                strokeDashoffset={assetOffset}
                strokeLinecap="round"
              />
              <circle
                cx={donutCx} cy={donutCy} r={donutR}
                fill="none"
                className="stroke-amber-500"
                strokeWidth={donutStroke}
                strokeDasharray={`${liabilityArc} ${circumference - liabilityArc}`}
                strokeDashoffset={liabilityOffset}
                strokeLinecap="round"
              />
              <circle
                cx={donutCx} cy={donutCy} r={donutR}
                fill="none"
                className="stroke-blue-500"
                strokeWidth={donutStroke}
                strokeDasharray={`${equityArc} ${circumference - equityArc}`}
                strokeDashoffset={equityOffset}
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* Balance Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">Assets</span>
              </div>
              <span className="text-sm font-black font-mono text-stone-900 dark:text-white tabular-nums">{formatNumber(totalAssets)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">Liabilities</span>
              </div>
              <span className="text-sm font-black font-mono text-stone-900 dark:text-white tabular-nums">{formatNumber(totalLiabilities)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">Equity</span>
              </div>
              <span className="text-sm font-black font-mono text-stone-900 dark:text-white tabular-nums">{formatNumber(totalEquity)}</span>
            </div>
            <div className="pt-2 mt-2 border-t border-stone-200 dark:border-stone-700/50">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">A = L + E Check</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  Math.abs(totalAssets - totalLiabilities - totalEquity) < 1
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                }`}>
                  {Math.abs(totalAssets - totalLiabilities - totalEquity) < 1 ? "Balanced ✓" : "Imbalanced ✗"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════ CHARTS ROW ═══════════════ */}
      <div className="grid gap-4 lg:grid-cols-2 mb-6">
        {/* Revenue & Expenses Area Chart */}
        {chartDataPoints.length > 0 && (
          <div className="rounded-2xl bg-white dark:bg-stone-900/80 border border-stone-200/60 dark:border-stone-700/40 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-white">Revenue &amp; Expenses</h3>
                <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5">6-month trend analysis</p>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-semibold flex-wrap">
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-stone-500">Revenue</span></div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /><span className="text-stone-500">COGS</span></div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500" /><span className="text-stone-500">Expense</span></div>
              </div>
            </div>
            <div className="w-full overflow-x-auto">
              <div className="min-w-[420px] h-[200px]">
                <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  {/* Grid */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                    const y = yOffset + ratio * chartHeight;
                    const val = ((1 - ratio) * maxFinanceVal);
                    return (
                      <g key={i}>
                        <line x1={xOffset} y1={y} x2={xOffset + chartWidth} y2={y} className="stroke-stone-100 dark:stroke-stone-800/60" strokeWidth="1" />
                        <text x={xOffset - 8} y={y + 3} textAnchor="end" className="fill-stone-300 dark:fill-stone-600 font-mono text-[9px]">
                          {formatCompact(val)}
                        </text>
                      </g>
                    );
                  })}
                  {/* X labels */}
                  {chartDataPoints.map((p, i) => {
                    const x = xOffset + (i / Math.max(chartDataPoints.length - 1, 1)) * chartWidth;
                    return <text key={i} x={x} y={yOffset + chartHeight + 16} textAnchor="middle" className="fill-stone-400 dark:fill-stone-500 text-[9px] font-medium">{p.label}</text>;
                  })}
                  {/* Revenue area fill */}
                  <path d={getFinAreaD("revenue")} fill="url(#revGrad)" className="area-glow" />
                  {/* Lines */}
                  <path d={getFinPathD("revenue")} fill="none" className="stroke-emerald-500" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d={getFinPathD("cogs")} fill="none" className="stroke-rose-500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 3" />
                  <path d={getFinPathD("expense")} fill="none" className="stroke-indigo-500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  {/* Dots */}
                  {chartDataPoints.map((p, i) => {
                    const rc = getFinCoord(i, p.revenue);
                    const cc = getFinCoord(i, p.cogs);
                    const ec = getFinCoord(i, p.expense);
                    return (
                      <g key={i}>
                        <circle cx={rc.x} cy={rc.y} r="3.5" className="graph-dot fill-emerald-500 stroke-white dark:stroke-stone-900" strokeWidth="2"><title>{p.label} Revenue: {formatNumber(p.revenue)}</title></circle>
                        <circle cx={cc.x} cy={cc.y} r="3" className="graph-dot fill-rose-500 stroke-white dark:stroke-stone-900" strokeWidth="2"><title>{p.label} COGS: {formatNumber(p.cogs)}</title></circle>
                        <circle cx={ec.x} cy={ec.y} r="3" className="graph-dot fill-indigo-500 stroke-white dark:stroke-stone-900" strokeWidth="2"><title>{p.label} Expense: {formatNumber(p.expense)}</title></circle>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Asset Valuation Trend */}
        {assetPoints.length > 0 && (
          <div className="rounded-2xl bg-white dark:bg-stone-900/80 border border-stone-200/60 dark:border-stone-700/40 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-white">Asset Valuation</h3>
                <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5">Historical total assets trend</p>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span className="text-stone-500">Total Assets</span>
              </div>
            </div>
            <div className="w-full overflow-x-auto">
              <div className="min-w-[420px] h-[200px]">
                <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
                  <defs>
                    <linearGradient id="assetGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#059669" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#059669" stopOpacity="0.01" />
                    </linearGradient>
                  </defs>
                  {/* Grid */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                    const y = yOffset + ratio * chartHeight;
                    const val = ((1 - ratio) * maxAssetsVal);
                    return (
                      <g key={i}>
                        <line x1={xOffset} y1={y} x2={xOffset + chartWidth} y2={y} className="stroke-stone-100 dark:stroke-stone-800/60" strokeWidth="1" />
                        <text x={xOffset - 8} y={y + 3} textAnchor="end" className="fill-stone-300 dark:fill-stone-600 font-mono text-[9px]">
                          {formatCompact(val)}
                        </text>
                      </g>
                    );
                  })}
                  {/* X labels */}
                  {assetPoints.map((p, i) => {
                    const x = xOffset + (i / Math.max(assetPoints.length - 1, 1)) * chartWidth;
                    return <text key={i} x={x} y={yOffset + chartHeight + 16} textAnchor="middle" className="fill-stone-400 dark:fill-stone-500 text-[9px] font-medium">{p.label}</text>;
                  })}
                  {/* Area fill */}
                  <path d={getAssetAreaD()} fill="url(#assetGrad)" className="area-glow" />
                  {/* Line */}
                  <path d={getAssetPathD()} fill="none" className="stroke-emerald-600" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  {/* Dots */}
                  {assetPoints.map((p, i) => {
                    const c = getAssetCoord(i, p.assets);
                    return (
                      <circle key={i} cx={c.x} cy={c.y} r="3.5" className="graph-dot fill-emerald-600 stroke-white dark:stroke-stone-900" strokeWidth="2">
                        <title>{p.label} Assets: {formatNumber(p.assets)}</title>
                      </circle>
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════ NET INCOME BAR CHART + TOP ACCOUNTS ═══════════════ */}
      <div className="grid gap-4 lg:grid-cols-5 mb-6">
        {/* Monthly Net Income Bars */}
        <div className="lg:col-span-3 rounded-2xl bg-white dark:bg-stone-900/80 border border-stone-200/60 dark:border-stone-700/40 p-6">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-4">Monthly Net Income</h2>
          <div className="flex items-end gap-2 h-[120px]">
            {monthlyNetIncome.map((m, i) => {
              const absMax = Math.max(...monthlyNetIncome.map(x => Math.abs(x.value)), 1);
              const pct = (Math.abs(m.value) / absMax) * 80;
              const isNeg = m.value < 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  {/* Tooltip */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-[9px] font-bold px-2 py-1 rounded-md whitespace-nowrap pointer-events-none z-10">
                    {formatNumber(m.value)}
                  </div>
                  <div
                    className={`w-full rounded-lg transition-all duration-300 group-hover:opacity-80 ${
                      isNeg ? "bg-red-400 dark:bg-red-500/70" : "bg-emerald-500 dark:bg-emerald-500/80"
                    }`}
                    style={{ height: `${Math.max(pct, 4)}%`, minHeight: "4px" }}
                  />
                  <span className="text-[9px] text-stone-400 font-medium mt-1">{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Accounts */}
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-stone-900/80 border border-stone-200/60 dark:border-stone-700/40 p-6">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-4">Top Accounts</h2>
          {topAccounts.length === 0 ? (
            <p className="text-xs text-stone-400 py-8 text-center">No accounts found</p>
          ) : (
            <div className="space-y-3">
              {topAccounts.map((acc, i) => {
                const maxBal = Math.max(...topAccounts.map(a => Math.abs(a.balance)), 1);
                const pct = (Math.abs(acc.balance) / maxBal) * 100;
                const catColor =
                  acc.category === "Asset" ? "bg-emerald-500" :
                  acc.category === "Liability" ? "bg-amber-500" :
                  acc.category === "Equity" ? "bg-blue-500" :
                  acc.category === "Revenue" ? "bg-emerald-400" :
                  acc.category === "Expense" ? "bg-indigo-500" :
                  "bg-stone-400";
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${catColor} shrink-0`} />
                        <span className="text-xs font-medium text-stone-700 dark:text-stone-300 truncate">{acc.name}</span>
                      </div>
                      <span className="text-xs font-bold font-mono text-stone-900 dark:text-white tabular-nums shrink-0 ml-2">
                        {formatCompact(acc.balance)}
                      </span>
                    </div>
                    <div className="w-full h-1 rounded-full bg-stone-100 dark:bg-stone-800">
                      <div
                        className={`h-full rounded-full ${catColor} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════ SYSTEM METRICS + QUICK ACTIONS ═══════════════ */}
      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        {/* System health mini cards */}
        <div className="rounded-2xl bg-white dark:bg-stone-900/80 border border-stone-200/60 dark:border-stone-700/40 p-5 flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.947 11.947 0 0 1 12 20.25a11.947 11.947 0 0 1-3-1.013v-.11c0-1.112-.285-2.16-.786-3.07M12 19.125v-.003c0-1.113-.285-2.16-.786-3.07M12 19.125A12.134 12.134 0 0 0 14.25 15m0 0a8.961 8.961 0 0 0 3-2.924M14.25 15a8.961 8.961 0 0 1-3-2.924M11.25 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM18.6 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM12 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Users</p>
              <p className="text-2xl font-black text-stone-900 dark:text-white">{userCount}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-stone-100 dark:border-stone-800/60">
            <div>
              <p className="text-[9px] font-bold uppercase text-stone-400">Groups</p>
              <p className="text-lg font-bold text-stone-900 dark:text-white">{groupCount}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase text-stone-400">Sessions (24h)</p>
              <p className="text-lg font-bold text-stone-900 dark:text-white">{activeSessionsCount}</p>
            </div>
          </div>
        </div>

        {/* Accounting System Stats */}
        <div className="rounded-2xl bg-white dark:bg-stone-900/80 border border-stone-200/60 dark:border-stone-700/40 p-5">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-4">Accounting System</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[9px] font-bold uppercase text-stone-400">CoA Codes</p>
              <p className="text-xl font-black text-stone-900 dark:text-white">{coaCount}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase text-stone-400">Accounts</p>
              <p className="text-xl font-black text-stone-900 dark:text-white">{accountCount}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase text-stone-400">Confirmed</p>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{confirmedCount}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase text-stone-400">Pending</p>
              <p className="text-xl font-black text-amber-600 dark:text-amber-400">{pendingCount}</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl bg-white dark:bg-stone-900/80 border border-stone-200/60 dark:border-stone-700/40 p-5">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            {hasAccess("/accounting/transaction/add", roleUrls) && (
              <Link href="/accounting/transaction/add" className="flex items-center gap-2 p-3 rounded-xl border border-stone-100 dark:border-stone-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-500/5 transition-all group">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                  <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </div>
                <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">Transaction</span>
              </Link>
            )}
            {hasAccess("/accounting/coa/add", roleUrls) && (
              <Link href="/accounting/coa/add" className="flex items-center gap-2 p-3 rounded-xl border border-stone-100 dark:border-stone-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-500/5 transition-all group">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                  <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </div>
                <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">New CoA</span>
              </Link>
            )}
            {hasAccess("/system/users/add", roleUrls) && (
              <Link href="/system/users/add" className="flex items-center gap-2 p-3 rounded-xl border border-stone-100 dark:border-stone-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-500/5 transition-all group">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                  <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </div>
                <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">Add User</span>
              </Link>
            )}
            {hasAccess("/system/logs", roleUrls) && (
              <Link href="/system/logs" className="flex items-center gap-2 p-3 rounded-xl border border-stone-100 dark:border-stone-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-500/5 transition-all group">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                  <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">Logs</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════ ACTIVITY FEED ═══════════════ */}
      <div className="rounded-2xl bg-white dark:bg-stone-900/80 border border-stone-200/60 dark:border-stone-700/40 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <h2 className="text-[11px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">Recent Activity</h2>
          </div>
          {hasAccess("/system/logs", roleUrls) && (
            <Link href="/system/logs" className="text-[10px] font-bold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 transition-colors">
              View All →
            </Link>
          )}
        </div>

        {recentLogs.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-xs text-stone-400">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {recentLogs.map((log) => (
              <div key={log._id.toString()} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors group">
                <div className={`flex items-center justify-center w-7 h-7 rounded-full border ${getActivityColor(log.category, log.level)} shrink-0`}>
                  {getActivityIcon(log.category, log.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate">
                      {formatActionLabel(log.action)}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider border ${getActivityColor(log.category, log.level)} shrink-0`}>
                      {log.category}
                    </span>
                  </div>
                  {log.detail && (
                    <p className="text-[10px] text-stone-400 dark:text-stone-500 truncate mt-0.5 break-all">
                      {log.detail}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-stone-400 font-medium">@{log.username}</p>
                  <p className="text-[9px] text-stone-300 dark:text-stone-600">{formatRelativeTime(log.created.at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
