import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import Link from "next/link";

export default async function UserGroupReportPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    redirect("/account/signin");
  }

  const payload = await verifyToken(token);

  if (!payload) {
    redirect("/account/signin");
  }

  let userCount = 0;
  let activeUsersCount = 0;
  let groupCount = 0;
  let adminUsersCount = 0;

  try {
    const db = await getDb();
    userCount = await db.collection("systemUsers").countDocuments();
    activeUsersCount = await db.collection("systemUsers").countDocuments({ isActive: { $ne: false } });
    groupCount = await db.collection("systemGroups").countDocuments();

    // Count admins group users (group ID: Administrators)
    const adminGroup = await db.collection("systemGroups").findOne({ name: "Administrators" });
    if (adminGroup) {
      adminUsersCount = await db.collection("systemUsers").countDocuments({ groupId: adminGroup._id });
    }
  } catch (error) {
    console.error("Report database fetch error:", error);
  }

  const cards = [
    { label: "Total Members", value: userCount, icon: "👤", desc: "Registered accounts in database" },
    { label: "Active Status", value: activeUsersCount, icon: "🟢", desc: "Non-disabled active users" },
    { label: "Administrators", value: adminUsersCount, icon: "🛡️", desc: "Full permissions members" },
    { label: "User Groups", value: groupCount, icon: "📁", desc: "Active security configurations" },
  ];

  return (
    <div className="max-w-full mx-auto space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white flex items-center gap-2">
            User & Group Report
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Database demographics, active permissions overview, and safety records.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="btn-secondary"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
          </svg>
          Back to Overview
        </Link>
      </div>

      {/* Overview Cards Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200/80 dark:border-stone-700/50 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between gap-4 mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">{card.label}</span>
              <span className="text-lg leading-none">{card.icon}</span>
            </div>
            <div>
              <p className="text-2xl font-black text-stone-900 dark:text-white">{card.value}</p>
              <p className="text-[10px] text-stone-500 mt-1">{card.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Distribution Statistics Summary */}
      <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200/80 dark:border-stone-700/50 shadow-sm">
        <h2 className="text-xs font-black uppercase tracking-widest text-stone-450 mb-3 pb-3 border-b border-stone-100 dark:border-stone-800/60">
          Distribution Summary
        </h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
              <span>Active User Ratio</span>
              <span>{userCount > 0 ? Math.round((activeUsersCount / userCount) * 100) : 0}%</span>
            </div>
            <div className="w-full bg-stone-100 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${userCount > 0 ? (activeUsersCount / userCount) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
              <span>Administrator Ratio</span>
              <span>{userCount > 0 ? Math.round((adminUsersCount / userCount) * 100) : 0}%</span>
            </div>
            <div className="w-full bg-stone-100 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${userCount > 0 ? (adminUsersCount / userCount) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
