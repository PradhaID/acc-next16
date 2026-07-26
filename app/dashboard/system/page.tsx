import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import Link from "next/link";
import SystemLogsTable from "@/components/system/SystemLogsTable";
import SystemMetrics from "@/components/system/SystemMetrics";
import { getDictionary, translate } from "@/lib/i18n";

export default async function SystemReportPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    redirect("/account/signin");
  }

  const payload = await verifyToken(token);

  if (!payload) {
    redirect("/account/signin");
  }

  const dict = getDictionary(payload.language);
  const t = (path: string) => translate(dict, path);

  const db = await getDb();

  const uptimeSeconds = Math.floor(process.uptime());
  const uptimeParts = [
    Math.floor(uptimeSeconds / 86400),
    Math.floor((uptimeSeconds % 86400) / 3600),
    Math.floor((uptimeSeconds % 3600) / 60),
    uptimeSeconds % 60,
  ];
  const uptimeLabel = uptimeParts
    .map((v, i) => (v > 0 || i > 0 ? `${v}${["d", "h", "m", "s"][i]}` : ""))
    .filter(Boolean)
    .join(" ") || "0s";

  const mem = process.memoryUsage();
  const ramUsedMb = (mem.heapUsed / 1024 / 1024).toFixed(1);
  const ramTotalMb = (mem.heapTotal / 1024 / 1024).toFixed(1);

  const initialMetrics = [
    { name: t("system.cpu"), value: "—", status: "healthy", color: "text-emerald-500" },
    { name: t("system.memory"), value: `${ramUsedMb} / ${ramTotalMb} MB`, status: "healthy", color: "text-emerald-500" },
    { name: t("system.uptime"), value: uptimeLabel, status: "healthy", color: "text-emerald-500" },
    { name: t("system.mongoStatus"), value: t("system.connected"), status: "healthy", color: "text-emerald-500" },
  ];

  const rawLogs = await db
    .collection("systemLogs")
    .find({})
    .sort({ "created.at": -1 })
    .limit(20)
    .toArray();

  const recentLogs = rawLogs.map((log: any) => ({
    _id: log._id?.toString() || Math.random().toString(36),
    time: new Date(log.created?.at).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
    level: log.level || "INFO",
    action: log.action,
    username: log.username,
    detail: log.detail || "-",
  }));

  return (
    <div className="max-w-full mx-auto space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white flex items-center gap-2">
            {t("system.report")}
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Real-time server telemetry and log tracking metrics.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="btn-action-secondary flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
          </svg>
          {t("common.back")}
        </Link>
      </div>

      {/* Metrics Row */}
      <SystemMetrics initial={initialMetrics} />

      {/* Logs Table */}
      <SystemLogsTable logs={recentLogs} />
    </div>
  );
}
