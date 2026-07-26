'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/components/LanguageProvider';
import {
    EyeIcon,
    UserGroupIcon,
    ArrowPathIcon,
    ChartBarIcon,
    GlobeAltIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';

interface AnalyticsData {
    totalViews: number;
    uniqueSessions: number;
    returningVisitors: number;
    avgViewsPerSession: number;
    topPages: { path: string; views: number }[];
    dailyViews: { date: string; views: number; sessions: number }[];
    topReferrers: { referrer: string; count: number }[];
    hourlyDistribution: { hour: number; views: number }[];
}

export default function AnalyticsPage() {
    const t = useT();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(30);

    useEffect(() => {
        fetchAnalytics();
    }, [days]);

    async function fetchAnalytics() {
        setLoading(true);
        try {
            const res = await fetch(`/api/analytics?days=${days}`);
            const json = await res.json();
            if (json.success) setData(json.data);
        } catch (err) {
            console.error('Failed to fetch analytics:', err);
        }
        setLoading(false);
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 text-sm font-medium animate-pulse">
                    Loading Analytics...
                </p>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center py-20 bg-white dark:bg-stone-800/40 rounded-2xl border border-dashed border-gray-300 dark:border-stone-700/50">
                <ChartBarIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No analytics data available.</p>
            </div>
        );
    }

    const maxDailyViews = Math.max(...data.dailyViews.map(d => d.views), 1);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {t('analytics.title')}
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {t('analytics.subtitle')}
                    </p>
                </div>
                <div className="flex gap-2">
                    {[7, 14, 30, 90].map(d => (
                        <button
                            key={d}
                            onClick={() => setDays(d)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                days === d
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-gray-100 dark:bg-stone-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-stone-700'
                            }`}
                        >
                            {d}d
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-stone-800/40 rounded-2xl border border-gray-200 dark:border-stone-700/50 p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                            <EyeIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
                                {t('analytics.totalViews')}
                            </p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {data.totalViews.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-stone-800/40 rounded-2xl border border-gray-200 dark:border-stone-700/50 p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                            <UserGroupIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
                                {t('analytics.uniqueVisitors')}
                            </p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {data.uniqueSessions.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-stone-800/40 rounded-2xl border border-gray-200 dark:border-stone-700/50 p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                            <ArrowPathIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
                                {t('analytics.returningVisitors')}
                            </p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {data.returningVisitors.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-stone-800/40 rounded-2xl border border-gray-200 dark:border-stone-700/50 p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                            <ChartBarIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
                                {t('analytics.avgViewsPerSession')}
                            </p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {data.avgViewsPerSession.toFixed(2)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-stone-800/40 rounded-2xl border border-gray-200 dark:border-stone-700/50 p-6">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <ChartBarIcon className="w-5 h-5 text-emerald-500" />
                        {t('analytics.trafficTrend')}
                    </h3>
                    <div className="space-y-2">
                        {data.dailyViews.slice(-14).map((day, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <span className="text-xs text-gray-500 dark:text-gray-400 w-20">
                                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                                <div className="flex-1 h-6 bg-gray-100 dark:bg-stone-700/50 rounded-lg overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-end px-2"
                                        style={{ width: `${(day.views / maxDailyViews) * 100}%` }}
                                    >
                                        {day.views > 0 && (
                                            <span className="text-xs font-bold text-white">
                                                {day.views}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white dark:bg-stone-800/40 rounded-2xl border border-gray-200 dark:border-stone-700/50 p-6">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <GlobeAltIcon className="w-5 h-5 text-emerald-500" />
                        {t('analytics.topPages')}
                    </h3>
                    <div className="space-y-3">
                        {data.topPages.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                                {t('analytics.noData')}
                            </p>
                        ) : (
                            data.topPages.map((page, i) => (
                                <div key={i} className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-6">
                                            #{i + 1}
                                        </span>
                                        <span className="text-sm text-gray-900 dark:text-white truncate">
                                            {page.path}
                                        </span>
                                    </div>
                                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                        {page.views}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-stone-800/40 rounded-2xl border border-gray-200 dark:border-stone-700/50 p-6">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <ClockIcon className="w-5 h-5 text-emerald-500" />
                        {t('analytics.peakHours')}
                    </h3>
                    <div className="grid grid-cols-6 gap-2">
                        {data.hourlyDistribution
                            .sort((a, b) => b.views - a.views)
                            .slice(0, 6)
                            .map((h, i) => (
                                <div key={i} className="text-center">
                                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                        {h.hour.toString().padStart(2, '0')}:00
                                    </div>
                                    <div className="mt-1 h-16 bg-gray-100 dark:bg-stone-700/50 rounded-lg overflow-hidden flex items-end">
                                        <div
                                            className="w-full bg-gradient-to-t from-emerald-500 to-emerald-600 rounded-lg"
                                            style={{
                                                height: `${(h.views / Math.max(...data.hourlyDistribution.map(x => x.views), 1)) * 100}%`,
                                            }}
                                        ></div>
                                    </div>
                                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                                        {h.views}
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>

                <div className="bg-white dark:bg-stone-800/40 rounded-2xl border border-gray-200 dark:border-stone-700/50 p-6">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <GlobeAltIcon className="w-5 h-5 text-emerald-500" />
                        {t('analytics.topReferrers')}
                    </h3>
                    <div className="space-y-3">
                        {data.topReferrers.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                                {t('analytics.noData')}
                            </p>
                        ) : (
                            data.topReferrers.map((ref, i) => (
                                <div key={i} className="flex items-center justify-between gap-3">
                                    <span className="text-sm text-gray-900 dark:text-white truncate flex-1">
                                        {ref.referrer}
                                    </span>
                                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                        {ref.count}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
