"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/LanguageProvider";

interface Metric {
  name: string;
  value: string;
  status: string;
  color: string;
}

export default function SystemMetrics({ initial }: { initial: Metric[] }) {
  const t = useT();
  const [metrics, setMetrics] = useState<Metric[]>(initial);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const res = await fetch("/api/system/metrics", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        setMetrics([
          { name: t("system.cpu"), value: data.cpu, status: "healthy", color: "text-emerald-500" },
          { name: t("system.memory"), value: data.memory, status: "healthy", color: "text-emerald-500" },
          { name: t("system.uptime"), value: data.uptime, status: "healthy", color: "text-emerald-500" },
          { name: t("system.mongoStatus"), value: t("system.connected"), status: "healthy", color: "text-emerald-500" },
        ]);
      } catch {}
    };

    const interval = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [t]);

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {metrics.map((metric) => (
        <div key={metric.name} className="bg-white dark:bg-stone-900/80 p-5 rounded-2xl border border-stone-200 dark:border-stone-700/50 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-500">{metric.name}</p>
          <p className="text-xl font-black text-stone-900 dark:text-white mt-1">
            {metric.value}
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">{metric.status}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
