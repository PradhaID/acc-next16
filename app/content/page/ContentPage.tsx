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
    DocumentIcon,
    ArrowsRightLeftIcon,
    InboxIcon
} from "@heroicons/react/24/outline";
import PageHeader from "@/components/ui/PageHeader";
import SearchInput from "@/components/ui/SearchInput";
import { useSelection } from "@/lib/use-selection";
import BulkActionBar from "@/components/ui/BulkActionBar";
import { formatRelativeTime } from "@/lib/time";
import { useT } from "@/components/LanguageProvider";
import { usePermission } from "@/hooks/useSession";
import { ROLES } from "@/lib/roles";

interface PageData {
    _id: string;
    title: string;
    slug: string;
    meta?: { description?: string };
    status: "draft" | "published" | "archived";
    parent?: { _id: string; title: string };
    author: { name: string; email: string };
    featuredImage?: { url: string };
    created: { at: string };
}

export default function ContentPage() {
    const t = useT();
    const canCreate = usePermission(ROLES.CREATE_PAGE);
    const canDelete = usePermission(ROLES.DELETE_PAGE);
    const canBulk = usePermission(ROLES.BULK_PAGE);
    const [pages, setPages] = useState<PageData[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [doSearch, setDoSearch] = useState("");
    const [status, setStatus] = useState<"all" | "published" | "draft">("all");
    const [page, setPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [stats, setStats] = useState({ published: 0, draft: 0, archived: 0 });
    const pageSize = 20;

    useEffect(() => {
        const handler = setTimeout(() => { setDoSearch(search); setPage(1); }, 400);
        return () => clearTimeout(handler);
    }, [search]);

    useEffect(() => { fetchPages(); }, [doSearch, status, page]);

    async function fetchPages() {
        setLoading(true);
        const params = new URLSearchParams();
        if (doSearch) params.set("search", doSearch);
        if (status !== "all") params.set("status", status);
        params.set("page", String(page));
        params.set("pageSize", String(pageSize));
        const res = await fetch(`/api/content/page?${params.toString()}`);
        const json = await res.json();
        setPages(json.data || []);
        setTotalItems(json.total || 0);
        setStats(json.stats || { published: 0, draft: 0, archived: 0 });
        setLoading(false);
    }

    const totalPages = Math.ceil(totalItems / pageSize);
    const pageIds = pages.map(p => p._id);
    const selection = useSelection(pageIds);

    async function handleDelete(id: string) {
        if (!confirm("Move this page to trash?")) return;
        const res = await fetch(`/api/content/page?id=${id}`, { method: "DELETE" });
        if (res.ok) fetchPages();
    }

    async function handleBulkAction(action: string) {
        const ids = Array.from(selection.selected);
        if (action === "delete") {
            if (!confirm(`Delete ${ids.length} pages?`)) return;
        }
        const res = await fetch("/api/content/page/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: action === "delete" ? "delete" : "status", ids, value: action === "publish" ? "published" : action === "draft" ? "draft" : undefined }),
        });
        if (res.ok) {
            selection.clear();
            fetchPages();
        }
    }

    return (
        <>
        <div className="max-w-full mx-auto space-y-4 pb-10 text-stone-900 dark:text-stone-100">
            {/* Header */}
            <PageHeader
                title={t("content.pagesTitle")}
                subtitle={t("content.pagesSubtitle")}
                actions={
                    canCreate && (
                        <Link
                            href="/content/page/add"
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:scale-105 active:scale-95 text-xs text-white px-3 py-2 rounded-xl font-bold shadow-md shadow-orange-500/10 transition-all"
                        >
                            <PlusIcon className="w-4 h-4 stroke-[3px]" />
                            {t("content.createNewPage")}
                        </Link>
                    )
                }
            />

            {/* Filter & Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 bg-white dark:bg-stone-900/80 p-2 rounded-2xl border border-stone-200 dark:border-stone-700/50 shadow-sm">
                {/* Status segmented control */}
                <div className="flex bg-stone-100 dark:bg-stone-800/40 p-1 rounded-xl shrink-0">
                    {(["all", "published", "draft"] as const).map(s => (
                        <button
                            key={s}
                            onClick={() => { setStatus(s); setPage(1); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${status === s ? 'bg-white dark:bg-stone-700 text-orange-600 shadow-sm' : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'}`}
                        >
                            {s.toUpperCase()}
                        </button>
                    ))}
                </div>

                <div className="hidden md:block w-px h-4 bg-stone-200 dark:bg-stone-700 shrink-0" />

                {/* Search */}
                <div className="flex-1 min-w-0">
                    <SearchInput
                        value={search}
                        onChange={(v) => { setSearch(v); setPage(1); }}
                            placeholder={t("content.searchPages")}
                    />
                </div>

                <div className="hidden md:block w-px h-4 bg-stone-200 dark:bg-stone-700 shrink-0" />

                {/* Stats pills */}
                    <div className="flex items-center gap-2 shrink-0 text-[10px] font-black md:pl-2">
                        <span className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg">{stats.published} {t("content.publishedAbbr")}</span>
                        <span className="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-lg">{stats.draft} {t("content.draftAbbr")}</span>
                        <span className="px-2.5 py-1.5 bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 rounded-lg">{totalItems} {t("content.totalAbbr")}</span>
                    </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-stone-900/80 border border-stone-200 dark:border-stone-700/50 rounded-2xl overflow-hidden shadow-sm dark:shadow-stone-950/30">
                {loading ? (
                    <div className="py-20 text-center">
                        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-stone-400 dark:text-stone-500 text-sm">{t("content.loadingPages")}</p>
                         </div>
                     ) : pages.length === 0 ? (
                         <div className="py-20 text-center">
                             <InboxIcon className="w-14 h-14 text-stone-200 dark:text-stone-700 mx-auto mb-3" />
                             <p className="text-stone-500 dark:text-stone-400 text-sm font-medium">No pages match your criteria.</p>
                             <button
                                 onClick={() => { setSearch(""); setStatus("all"); }}
                                 className="mt-3 text-orange-600 text-xs font-bold hover:underline"
                             >
                                 {t("content.clearFilters")}
                             </button>
                         </div>
                ) : (
                    <>
                        {/* Mobile: Card list */}
                        <div className="md:hidden divide-y divide-stone-200 dark:divide-stone-700/30">
                            {pages.map(p => (
                                <div key={p._id} className="p-4">
                                    <div className="flex items-start gap-3">
                                        <input
                                            type="checkbox"
                                            checked={selection.isSelected(p._id)}
                                            onChange={() => selection.toggle(p._id)}
                                            className="w-4 h-4 rounded border-stone-300 dark:border-stone-600 text-orange-600 focus:ring-orange-500 cursor-pointer mt-1 shrink-0"
                                        />
                                        <div className="h-10 w-10 rounded-xl bg-orange-50 dark:bg-orange-950/20 flex-shrink-0 overflow-hidden border border-orange-100 dark:border-orange-900 flex items-center justify-center">
                                            {p.featuredImage?.url ? (
                                                <img src={p.featuredImage.url} className="w-full h-full object-cover" alt={p.title || "Page thumbnail"} />
                                            ) : (
                                                <DocumentIcon className="w-5 h-5 text-orange-500" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start gap-2 min-w-0">
                                                <p className="font-bold text-sm text-gray-900 dark:text-white leading-snug break-words min-w-0">
                                                    {p.title}
                                                </p>
                                                <span className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                                                    p.status === 'published'
                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                                                        : p.status === 'archived'
                                                            ? 'bg-gray-100 text-gray-500 dark:bg-stone-800/40 dark:text-stone-400'
                                                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                                                }`}>
                                                    {p.status}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400 font-mono break-all mt-0.5">/{p.slug}</p>
                                            {p.meta?.description && (
                                                <p className="text-xs text-gray-500 dark:text-stone-400 break-words mt-0.5">{p.meta.description}</p>
                                            )}
                                            {p.parent && (
                                                <div className="flex items-center gap-1.5 mt-1.5">
                                                    <ArrowsRightLeftIcon className="w-3 h-3 text-gray-400" />
                                                    <span className="text-[10px] font-bold text-gray-500 dark:text-stone-400 truncate">{p.parent.title}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className="text-[10px] text-gray-400">
                                                    {formatRelativeTime(p.created.at)}
                                                </span>
                                                <div className="flex items-center gap-2 ml-auto">
                                                    <Link
                                                        href={`/content/page/detail/${p._id}`}
                                                        className="px-2.5 py-1 bg-gray-50 hover:bg-gray-100 dark:bg-stone-800/40 text-gray-500 dark:text-stone-400 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                                                    >
                                                         {t("content.view")}
                                                     </Link>
                                                    <Link
                                                        href={`/content/page/edit/${p._id}`}
                                                        className="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                                                    >
                                                         {t("actions.edit")}
                                                     </Link>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop: Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full table-auto text-left">
                                <thead className="bg-stone-50/50 dark:bg-stone-800/30 border-b border-stone-200 dark:border-stone-700/50">
                                    <tr>
                                        <th className="px-4 py-3 w-10">
                                            <input
                                                type="checkbox"
                                                checked={selection.isAllSelected}
                                                onChange={selection.toggleAll}
                                                className="w-4 h-4 rounded border-stone-300 dark:border-stone-600 text-orange-600 focus:ring-orange-500 cursor-pointer"
                                            />
                                        </th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">{t("content.page")}</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">{t("content.description")}</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">{t("content.hierarchy")}</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">{t("profile.status")}</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">{t("logs.created")}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-200 dark:divide-stone-700/30">
                                    {pages.map(p => (
                                        <tr key={p._id} className="group hover:bg-stone-100 dark:hover:bg-stone-800/40 transition-all">
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selection.isSelected(p._id)}
                                                    onChange={() => selection.toggle(p._id)}
                                                    className="w-4 h-4 rounded border-stone-300 dark:border-stone-600 text-orange-600 focus:ring-orange-500 cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-4 py-3 max-w-xs">
                                                <div className="flex items-start gap-3">
                                                    <div className="h-10 w-10 mr-1 rounded-xl bg-orange-50 dark:bg-orange-950/20 flex-shrink-0 overflow-hidden border border-orange-100 dark:border-orange-900 flex items-center justify-center">
                                                        {p.featuredImage?.url ? (
                                                            <img src={p.featuredImage.url} className="w-full h-full object-cover" alt={p.title || "Page thumbnail"} />
                                                        ) : (
                                                            <DocumentIcon className="w-5 h-5 text-orange-500" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[220px]">{p.title}</p>
                                                        <p className="text-xs text-gray-400 font-mono truncate">/{p.slug}</p>
                                                         {/* Actions — visible on row hover */}
                                                         <div className="flex items-center gap-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                             <Link
                                                                 href={`/content/page/detail/${p._id}`}
                                                                 className="flex items-center gap-1 text-orange-600 dark:text-orange-400 text-[10px] font-black uppercase tracking-wider hover:underline"
                                                             >
                                                                 <EyeIcon className="w-3 h-3" /> View
                                                             </Link>
                                                             <Link
                                                                 href={`/content/page/edit/${p._id}`}
                                                                 className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider hover:underline"
                                                             >
                                                                 <PencilSquareIcon className="w-3 h-3" /> Edit
                                                             </Link>
                                                             {canDelete && (
                                                                 <button
                                                                     onClick={() => handleDelete(p._id)}
                                                                     className="flex items-center gap-1 text-red-500 dark:text-red-400 text-[10px] font-black uppercase tracking-wider hover:underline"
                                                                 >
                                                                     <TrashIcon className="w-3 h-3" /> Delete
                                                                 </button>
                                                             )}
                                                         </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Description */}
                                            <td className="px-4 py-3">
                                                <p className="text-xs text-gray-500 dark:text-stone-400 truncate max-w-[200px]">
                                                    {p.meta?.description || <span className="italic text-gray-300 dark:text-stone-600">{t("content.noDescription")}</span>}
                                                </p>
                                            </td>

                                            {/* Hierarchy */}
                                            <td className="px-4 py-3">
                                                {p.parent ? (
                                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-stone-400 bg-gray-100 dark:bg-stone-800/40 w-fit px-3 py-1 rounded-lg">
                                                        <ArrowsRightLeftIcon className="w-3 h-3" />
                                                        <span className="truncate max-w-[100px]">{p.parent.title}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] font-black text-gray-300 dark:text-stone-600 uppercase italic">{t("content.mainPage")}</span>
                                                )}
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                                    p.status === 'published'
                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                                                        : p.status === 'archived'
                                                            ? 'bg-gray-100 text-gray-500 dark:bg-stone-800/40 dark:text-stone-400'
                                                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                                                }`}>
                                                    {p.status}
                                                </span>
                                            </td>

                                            {/* Date */}
                                            <td className="px-4 py-3 text-xs text-gray-500 dark:text-stone-400">
                                                {formatRelativeTime(p.created.at)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-stone-200 dark:border-stone-700/50 flex items-center justify-between">
                        <span className="text-[10px] font-black text-stone-500 dark:text-stone-400 uppercase tracking-widest">Page {page} of {totalPages}</span>
                        <div className="flex gap-1.5">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                                className="p-1.5 border border-stone-200 dark:border-stone-700 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 transition-all"
                            >
                                <ChevronLeftIcon className="w-4 h-4" />
                            </button>
                            <button
                                disabled={page === totalPages}
                                onClick={() => setPage(p => p + 1)}
                                className="p-1.5 border border-stone-200 dark:border-stone-700 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 transition-all"
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
                        { label: t("actions.publish"), action: "publish", variant: "primary" },
                        { label: t("actions.draft"), action: "draft", variant: "warning" },
                        { label: t("content.delete"), action: "delete", variant: "danger", confirm: t("common.areYouSure") },
                    ]}
                    onAction={handleBulkAction}
                    onClear={selection.clear}
                />
            )}

        </>
    );
}