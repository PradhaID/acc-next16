'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    PlusIcon,
    PencilSquareIcon,
    TrashIcon,
    EyeIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    PhotoIcon,
    InboxIcon,
    ClockIcon,
    InformationCircleIcon
} from "@heroicons/react/24/outline";
import PageHeader from "@/components/ui/PageHeader";
import SearchInput from "@/components/ui/SearchInput";
import { useSelection } from "@/lib/use-selection";
import BulkActionBar from "@/components/ui/BulkActionBar";
import { useT } from "@/components/LanguageProvider";
import { usePermission } from "@/hooks/useSession";
import { ROLES } from "@/lib/roles";

interface AdItem {
    imageUrl: string;
    linkUrl?: string;
    altText?: string;
}

interface Ad {
    _id: string;
    name: string;
    position: string;
    type: string;
    items: AdItem[];
    isActive: boolean;
    isFirstTimeOnly: boolean;
    startDate?: string;
    endDate?: string;
    created?: { at: string };
}

export default function AdManagementPage() {
    const t = useT();
    const canCreate = usePermission(ROLES.CREATE_AD);
    const canDelete = usePermission(ROLES.DELETE_AD);
    const canBulk = usePermission(ROLES.BULK_AD);
    const [ads, setAds] = useState<Ad[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
    const [positionFilter, setPositionFilter] = useState("all");
    const [page, setPage] = useState(1);
    const pageSize = 15;

    useEffect(() => {
        fetchAds();
    }, []);

    async function fetchAds() {
        setLoading(true);
        try {
            const res = await fetch("/api/content/ad");
            const json = await res.json();
            setAds(json.data || []);
        } catch (err) {
            console.error("Failed to fetch ads:", err);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm(t("ad.deleteConfirm"))) return;
        try {
            const res = await fetch(`/api/content/ad?id=${id}`, { method: 'DELETE' });
            if (res.ok) fetchAds();
        } catch (err) {
            console.error("Failed to delete ad:", err);
        }
    }

    // Positions for filter
    const positions = [
        { value: "HOME_BELOW_FEATURED", label: "Home: Below Featured Post" },
        { value: "HOME_SIDEBAR", label: "Home: Sidebar (Top)" },
        { value: "HOME_SIDEBAR_2", label: "Home: Sidebar (Below Top Stories)" },
        { value: "HOME_FEED_1", label: "Home Feed: After 3rd Post" },
        { value: "HOME_FEED_2", label: "Home Feed: After 6th Post" },
        { value: "HOME_FEED_3", label: "Home Feed: After 9th Post" },
        { value: "HOME_POPUP", label: "Home: First-Visit Popup" },
        { value: "POST_PAGE_ABOVE_CONTENT", label: "Post Page: Above Content" },
        { value: "POST_PAGE_SIDEBAR", label: "Post Page: Sidebar" },
        { value: "POST_PAGE_ABOVE_TAGS", label: "Post Page: Above Tags" },
    ];

    const filtered = ads.filter(ad => {
        const matchesSearch = ad.name.toLowerCase().includes(search.toLowerCase()) ||
            ad.position.toLowerCase().replace(/_/g, " ").includes(search.toLowerCase());
        const matchesStatus = statusFilter === "all" ||
            (statusFilter === "active" ? ad.isActive : !ad.isActive);
        const matchesPosition = positionFilter === "all" || ad.position === positionFilter;

        return matchesSearch && matchesStatus && matchesPosition;
    });

    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
    const totalPages = Math.ceil(filtered.length / pageSize);
    const adIds = paginated.map(a => a._id);
    const selection = useSelection(adIds);

    async function handleBulkAction(action: string) {
        const ids = Array.from(selection.selected);
        if (action === "delete") {
            if (!confirm(`Delete ${ids.length} ads?`)) return;
        }
        const res = await fetch("/api/content/ad/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: action === "delete" ? "delete" : "status", ids, value: action === "activate" ? "true" : action === "deactivate" ? "false" : undefined }),
        });
        if (res.ok) {
            selection.clear();
            fetchAds();
        }
    }

    const stats = {
        total: ads.length,
        active: ads.filter(a => a.isActive).length,
        inactive: ads.filter(a => !a.isActive).length
    };

    return (
        <>
        <div className="max-w-full mx-auto space-y-4 pb-10 text-gray-900 dark:text-stone-100">
            <PageHeader
                title={t("ad.title")}
                subtitle={t("ad.subtitle")}
                actions={
                    canCreate && (
                        <Link
                            href="/content/ad/add"
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:scale-105 active:scale-95 text-xs text-white px-3 py-2 rounded-xl font-bold shadow-md shadow-orange-500/10 transition-all"
                        >
                            <PlusIcon className="w-4 h-4 stroke-[3px]" /> {t("ad.newAd")}
                        </Link>
                    )
                }
            />

            {/* Filter & Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 bg-white dark:bg-stone-900/80 p-2 rounded-2xl border border-gray-200 dark:border-stone-700/50 shadow-sm">
                {/* Status segmented control */}
                <div className="flex bg-gray-100 dark:bg-stone-800/40 p-1 rounded-xl shrink-0">
                    {(["all", "active", "inactive"] as const).map(s => (
                        <button
                            key={s}
                            onClick={() => { setStatusFilter(s); setPage(1); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${statusFilter === s ? 'bg-white dark:bg-stone-700 text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            {s.toUpperCase()}
                        </button>
                    ))}
                </div>

                {/* Position filter */}
                <select
                    value={positionFilter}
                    onChange={e => { setPositionFilter(e.target.value); setPage(1); }}
                    className="px-3 py-2.5 bg-white dark:bg-stone-900/80 border border-gray-200 dark:border-stone-700/50 rounded-xl text-xs font-bold outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 cursor-pointer shrink-0 text-stone-700 dark:text-stone-300"
                >
                    <option value="all">{t("ad.allPositions")}</option>
                    {positions.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                </select>

                {/* Search */}
                <div className="flex-1 min-w-0">
                    <SearchInput
                        value={search}
                        onChange={(v) => { setSearch(v); setPage(1); }}
                        placeholder={t("content.searchAds")}
                    />
                </div>

                {/* Stats pills */}
                <div className="flex items-center gap-2 shrink-0 text-[10px] font-black md:pl-2">
                    <span className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg">{stats.active} ACT</span>
                    <span className="px-2.5 py-1.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg">{stats.inactive} INA</span>
                    <span className="px-2.5 py-1.5 bg-stone-100 dark:bg-stone-800/60 text-stone-500 rounded-lg">{stats.total} TOTAL</span>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-stone-900/80 border border-gray-200 dark:border-stone-700/50 rounded-2xl overflow-hidden shadow-sm">
                {loading ? (
                    <div className="py-20 text-center">
                        <div className="w-10 h-10 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-400 text-sm">{t("ad.loading")}</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-20 text-center">
                        <InboxIcon className="w-14 h-14 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm font-medium">{t("ad.noResults")}</p>
                        <button
                            onClick={() => { setSearch(""); setStatusFilter("all"); setPositionFilter("all"); }}
                            className="mt-3 text-orange-600 text-xs font-bold hover:underline"
                        >
                            {t("ad.clearFilters")}
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full table-auto text-left">
                            <thead className="bg-gray-50/50 dark:bg-stone-800/40 border-b border-gray-100 dark:border-stone-700/50">
                                <tr>
                                    <th className="px-3 py-2.5 w-10">
                                        <input
                                            type="checkbox"
                                            checked={selection.isAllSelected}
                                            onChange={selection.toggleAll}
                                            className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                                        />
                                    </th>
                                    <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-400">{t("ad.advertisement")}</th>
                                    <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-400">{t("ad.position")}</th>
                                    <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-400">{t("ad.format")}</th>
                                    <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">{t("ad.status")}</th>
                                    <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-400">{t("ad.created")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-stone-700/30">
                                {paginated.map(ad => (
                                    <tr key={ad._id} className="group hover:bg-orange-50/40 dark:hover:bg-orange-500/5 transition-all">
                                        <td className="px-3 py-2.5">
                                            <input
                                                type="checkbox"
                                                checked={selection.isSelected(ad._id)}
                                                onChange={() => selection.toggle(ad._id)}
                                                className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                                            />
                                        </td>
                                        <td className="px-3 py-2.5 max-w-xs">
                                            <div className="flex items-start gap-2.5">
                                                <div className="h-9 w-9 mr-1 rounded-xl bg-gray-100 dark:bg-stone-800/40 flex-shrink-0 overflow-hidden border border-gray-100 dark:border-stone-700/50 translate-y-0.5">
                                                    {ad.items?.[0]?.imageUrl ? (
                                                        <img src={ad.items[0].imageUrl} className="w-full h-full object-cover" alt="" />
                                                    ) : (
                                                        <PhotoIcon className="w-4 h-4 m-2.5 text-gray-300" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold truncate max-w-[220px]">{ad.name}</p>
                                                    <p className="text-[9px] text-gray-400 font-mono italic">
                                                        {ad.items[0]?.linkUrl
                                                            ? (ad.items[0].linkUrl.length > 35 ? ad.items[0].linkUrl.substring(0, 35) + '...' : ad.items[0].linkUrl)
                                                            : t("ad.noDestinationLink")}
                                                    </p>

                                                    {/* Actions — visible on row hover */}
                                                    <div className="flex items-center gap-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Link
                                                             href={`/content/ad/edit/${ad._id}`}
                                                             className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase hover:underline"
                                                         >
                                                              <PencilSquareIcon className="w-3 h-3" /> {t("actions.edit")}
                                                         </Link>
                                                         {canDelete && (
                                                             <button
                                                                 onClick={() => handleDelete(ad._id)}
                                                                 className="flex items-center gap-1 text-red-500 dark:text-red-400 text-[9px] font-black uppercase hover:underline"
                                                             >
                                                                  <TrashIcon className="w-3 h-3" /> {t("actions.delete")}
                                                             </button>
                                                         )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-3 py-2.5">
                                            <span className="text-[10px] font-bold text-gray-700 dark:text-stone-300 bg-gray-100 dark:bg-stone-800/40 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                                {ad.position.replace(/_/g, " ")}
                                            </span>
                                        </td>

                                        <td className="px-3 py-2.5">
                                            <p className="text-[10px] font-bold text-gray-700 dark:text-stone-300">{ad.type}</p>
                                             <p className="text-[9px] text-gray-400 font-mono uppercase">{ad.items.length} {t("ad.slides")}</p>
                                        </td>

                                        <td className="px-3 py-2.5 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${ad.isActive
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                                                    : 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                                                    }`}>
                                                    {ad.isActive ? t("ad.active") : t("ad.inactive")}
                                                </span>
                                                {ad.isFirstTimeOnly && (
                                                     <span className="text-[8px] font-bold text-orange-500 uppercase tracking-tighter">{t("ad.firstVisitOnlyBadge")}</span>
                                                )}
                                            </div>
                                        </td>

                                        <td className="px-3 py-2.5">
                                            <p className="text-[10px] text-gray-600 dark:text-stone-400">
                                                {ad.created?.at
                                                    ? new Date(ad.created.at).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: '2-digit' })
                                                    : '-'}
                                            </p>
                                            {ad.endDate && (
                                                <p className="text-[8px] text-gray-400 italic font-medium">Exp: {new Date(ad.endDate).toLocaleDateString("id-ID", { day: 'numeric', month: 'short' })}</p>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-gray-100 dark:border-stone-700/50/50 flex items-center justify-between">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t("ad.pageOf").replace("{page}", String(page)).replace("{total}", String(totalPages))}</span>
                        <div className="flex gap-1.5">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                                className="p-1.5 border border-gray-200 dark:border-stone-700/50 rounded-lg hover:bg-gray-50 dark:hover:bg-stone-800/40 disabled:opacity-30 transition-all"
                            >
                                <ChevronLeftIcon className="w-4 h-4" />
                            </button>
                            <button
                                disabled={page === totalPages}
                                onClick={() => setPage(p => p + 1)}
                                className="p-1.5 border border-gray-200 dark:border-stone-700/50 rounded-lg hover:bg-gray-50 dark:hover:bg-stone-800/40 disabled:opacity-30 transition-all"
                            >
                                <ChevronRightIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>

            {canBulk && (
                <BulkActionBar
                    count={selection.count}
                    actions={[
                        { label: t("actions.activate"), action: "activate", variant: "primary" },
                        { label: t("actions.deactivate"), action: "deactivate", variant: "warning" },
                        { label: t("actions.delete"), action: "delete", variant: "danger", confirm: t("common.areYouSure") },
                    ]}
                    onAction={handleBulkAction}
                    onClear={selection.clear}
                />
            )}

        </>
    );
}
