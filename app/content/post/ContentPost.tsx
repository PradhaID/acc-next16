'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    PlusIcon,
    PencilSquareIcon,
    TrashIcon,
    CheckCircleIcon,
    ClockIcon,
    EyeIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    DocumentTextIcon,
    InboxIcon,
    SparklesIcon,
    XMarkIcon
} from "@heroicons/react/24/outline";
import PageHeader from "@/components/ui/PageHeader";
import SearchInput from "@/components/ui/SearchInput";
import { useSelection } from "@/lib/use-selection";
import BulkActionBar from "@/components/ui/BulkActionBar";
import { formatRelativeTime } from "@/lib/time";
import { useT } from "@/components/LanguageProvider";
import { useSettings } from "@/lib/settings-context";
import { usePermission } from "@/hooks/useSession";
import { ROLES } from "@/lib/roles";
import Toggle from "@/components/ui/Toggle";

interface Post {
    _id: string;
    title: string;
    meta: { description: string; keywords: string; };
    slug: string;
    status: "draft" | "published" | "archived";
    author: { name: string; email: string; };
    featuredImage?: { url: string };
    categories?: Array<{ _id: string; name: string; parent?: { name: string }; }>;
    created: { at: string; };
    published?: { at?: string; };
}

export default function ContentPost() {
    const t = useT();
    const settings = useSettings();
    const aiConfigured = !!(settings.ai_url && settings.ai_api_key && settings.ai_model && settings.searxng_url);
    const canCreate = usePermission(ROLES.CREATE_POST);
    const canDelete = usePermission(ROLES.DELETE_POST);
    const canBulk = usePermission(ROLES.BULK_POST);
    const canGenerate = usePermission(ROLES.GENERATE_POST);
    const [posts, setPosts] = useState<Post[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
    const [category, setCategory] = useState("all");
    const [page, setPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [stats, setStats] = useState({ published: 0, draft: 0, archived: 0 });
    const postIds = posts.map(p => p._id);
    const selection = useSelection(postIds);
    const pageSize = 20;
    const [doSearch, setDoSearch] = useState(search);

    // AI Generate Modal state
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [generateQuery, setGenerateQuery] = useState("");
    const [generateLoading, setGenerateLoading] = useState(false);
    const [generateResult, setGenerateResult] = useState<{ success: boolean; message: string } | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [generateWithImage, setGenerateWithImage] = useState(true);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDoSearch(search);
            setPage(1);
        }, 400);
        return () => clearTimeout(handler);
    }, [search]);

    useEffect(() => {
        fetchPosts();
    }, [doSearch, statusFilter, category, page]);

    useEffect(() => {
        fetchCategories();
    }, []);

    async function fetchPosts() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (doSearch) params.set("search", doSearch);
            if (statusFilter !== "all") params.set("status", statusFilter);
            if (category !== "all") params.set("category", category);
            params.set("page", String(page));
            params.set("pageSize", String(pageSize));
            const res = await fetch(`/api/content/post?${params.toString()}`);
            const json = await res.json();
            setPosts(json.data || []);
            setTotalItems(json.total || 0);
            setStats(json.stats || { published: 0, draft: 0, archived: 0 });
        } finally {
            setLoading(false);
        }
    }

    async function fetchCategories() {
        const res = await fetch("/api/content/category?active=true&all=true");
        const json = await res.json();
        setCategories(json.data || []);
    }

    async function handleDelete(id: string) {
        if (!confirm("Move this post to trash?")) return;
        const res = await fetch(`/api/content/post?id=${id}`, { method: "DELETE" });
        if (res.ok) fetchPosts();
    }

    async function handleBulkAction(action: string) {
        const ids = Array.from(selection.selected);
        if (action === "delete") {
            if (!confirm(`Delete ${ids.length} posts?`)) return;
        }
        const res = await fetch("/api/content/post/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: action === "delete" ? "delete" : "status", ids, value: action === "publish" ? "published" : action === "draft" ? "draft" : undefined }),
        });
        if (res.ok) {
            selection.clear();
            fetchPosts();
        }
    }

    async function handleGenerate() {
        if (!generateQuery.trim()) return;
        setGenerateLoading(true);
        setGenerateResult(null);
        setElapsedSeconds(0);

        const timer = setInterval(() => {
            setElapsedSeconds(s => s + 1);
        }, 1000);

        try {
            const res = await fetch('/api/content/post/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: generateQuery, generateImage: generateWithImage }),
            });
            const json = await res.json();
            setGenerateResult({ success: json.success, message: json.message || json.error || 'Unknown response' });
            if (json.success) {
                setTimeout(() => fetchPosts(), 500);
            }
        } catch (e: any) {
            setGenerateResult({ success: false, message: e.message });
        } finally {
            clearInterval(timer);
            setGenerateLoading(false);
        }
    }

    const totalPages = Math.ceil(totalItems / pageSize);

    return (
        <>
            <div className="max-w-full mx-auto space-y-4 pb-10 text-stone-900 dark:text-stone-100">

                <PageHeader
                    title={t("content.postsTitle")}
                    subtitle={t("content.postsSubtitle")}
                    actions={
                        <div className="flex items-center gap-2">
                            {aiConfigured && canGenerate && (
                                <button
                                    onClick={() => { setShowGenerateModal(true); setGenerateQuery(""); setGenerateResult(null); }}
                                    className="bg-gradient-to-r from-emerald-500 via-emerald-500 to-emerald-500 hover:scale-105 active:scale-95 text-xs text-white px-3 py-2 rounded-xl font-bold shadow-md shadow-emerald-500/10 transition-all flex items-center gap-2"
                                >
                                    <SparklesIcon className="w-4 h-4 stroke-[2.5px]" /> {t("content.generateAI")}
                                </button>
                            )}
                            {canCreate && (
                                <Link
                                    href="/content/post/add"
                                    className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:scale-105 active:scale-95 text-xs text-white px-3 py-2 rounded-xl font-bold shadow-md shadow-emerald-500/10 transition-all"
                                >
                                    <PlusIcon className="w-4 h-4 stroke-[3px]" /> {t("content.newPost")}
                                </Link>
                            )}
                        </div>
                    }
                />

                {/* Filter & Search Bar */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 bg-white dark:bg-stone-900/80 p-2 rounded-2xl border border-stone-200 dark:border-stone-700/50 shadow-sm">
                    {/* Status segmented control */}
                    <div className="flex bg-stone-100 dark:bg-stone-800/40 p-1 rounded-xl shrink-0">
                        {(["all", "published", "draft"] as const).map(s => (
                            <button
                                key={s}
                                onClick={() => { setStatusFilter(s); setPage(1); }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${statusFilter === s ? 'bg-white dark:bg-stone-700 text-emerald-600 shadow-sm' : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'}`}
                            >
                                {s.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    <div className="hidden md:block w-px h-4 bg-stone-200 dark:bg-stone-700 shrink-0" />

                    {/* Category filter */}
                    <select
                        value={category}
                        onChange={e => { setCategory(e.target.value); setPage(1); }}
                        className="px-4 py-2 bg-transparent outline-none text-sm focus:ring-0 cursor-pointer text-stone-700 dark:text-stone-300"
                    >
                        <option value="all">{t("content.allCategories")}</option>
                        {categories.map(c => (
                            <option key={c._id} value={c._id}>{c.name}</option>
                        ))}
                    </select>

                    <div className="hidden md:block w-px h-4 bg-stone-200 dark:bg-stone-700 shrink-0" />

                    {/* Search */}
                    <div className="flex-1 min-w-0">
                        <SearchInput
                            value={search}
                            onChange={(v) => { setSearch(v); setPage(1); }}
                            placeholder={t("content.searchPosts")}
                        />
                    </div>

                    <div className="hidden md:block w-px h-4 bg-stone-200 dark:bg-stone-700 shrink-0" />

                    {/* Stats pills */}
                    <div className="flex items-center gap-2 shrink-0 text-[10px] font-black md:pl-2">
                        <span className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg">{stats.published} {t("content.publishedAbbr")}</span>
                        <span className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg">{stats.draft} {t("content.draftAbbr")}</span>
                        <span className="px-2.5 py-1.5 bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 rounded-lg">{totalItems} {t("content.totalAbbr")}</span>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-stone-900/80 border border-stone-200 dark:border-stone-700/50 rounded-2xl overflow-hidden shadow-sm dark:shadow-stone-950/30">
                    {loading ? (
                        <div className="py-20 text-center">
                            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-stone-400 dark:text-stone-500 text-sm">{t("content.loadingArticles")}</p>
                         </div>
                     ) : posts.length === 0 ? (
                         <div className="py-20 text-center">
                             <InboxIcon className="w-14 h-14 text-stone-200 dark:text-stone-700 mx-auto mb-3" />
                             <p className="text-stone-500 dark:text-stone-400 text-sm font-medium">{t("content.noResultsPosts")}</p>
                             <button
                                 onClick={() => { setSearch(""); setStatusFilter("all"); setCategory("all"); }}
                                 className="mt-3 text-emerald-600 text-xs font-bold hover:underline"
                             >
                                 {t("content.clearFilters")}
                             </button>
                         </div>
                    ) : (
                        <>
                            {/* Mobile: Card list */}
                            <div className="md:hidden divide-y divide-stone-200 dark:divide-stone-700/30">
                                {posts.map(p => (
                                    <div key={p._id} className="p-4">
                                        <div className="flex items-start gap-3">
                                            <input
                                                type="checkbox"
                                                checked={selection.isSelected(p._id)}
                                                onChange={() => selection.toggle(p._id)}
                                                className="w-4 h-4 rounded border-stone-300 dark:border-stone-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer mt-1 shrink-0"
                                            />
                                            <div className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-stone-800/40 flex-shrink-0 overflow-hidden border border-gray-100 dark:border-stone-700/50">
                                                {p.featuredImage?.url ? (
                                                    <img src={p.featuredImage.url} className="w-full h-full object-cover" alt={p.title || "Post thumbnail"} />
                                                ) : (
                                                    <DocumentTextIcon className="w-4 h-4 m-3 text-gray-300" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start gap-2 min-w-0">
                                                    <p className="font-bold text-sm text-gray-900 dark:text-white leading-snug break-words min-w-0">
                                                        {p.title}
                                                    </p>
                                                    <span className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${p.status === 'published'
                                                        ? (p.published?.at && new Date(p.published.at) > new Date()
                                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                                                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400')
                                                        : p.status === 'archived'
                                                            ? 'bg-gray-100 text-gray-500 dark:bg-stone-800/40 dark:text-stone-400'
                                                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                                                        }`}>
                                                        {p.status === 'published' && p.published?.at && new Date(p.published.at) > new Date() ? t("status.scheduled") : p.status}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-400 font-mono break-all mt-0.5">/{p.slug}</p>
                                                <p className="text-xs text-gray-500 dark:text-stone-400 break-words mt-0.5">{p.author?.name || "Unknown"}</p>
                                                {p.categories && p.categories.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                                        {p.categories.slice(0, 2).map((cat, i) => (
                                                            <span key={i} className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 px-1.5 py-0.5 rounded text-[9px] font-black uppercase">
                                                                {cat.name}
                                                            </span>
                                                        ))}
                                                        {p.categories.length > 2 && (
                                                            <span className="text-[10px] text-gray-400 font-bold">+{p.categories.length - 2}</span>
                                                        )}
                                                    </div>
                                                )}
                                                    <div className="flex items-center gap-3 mt-2">
                                                     <span className="text-[10px] text-gray-400">
                                                         {formatRelativeTime(p.published?.at || p.created.at)}
                                                     </span>
                                                     <div className="flex items-center gap-2 ml-auto">
                                                         <Link
                                                             href={`/content/post/detail/${p._id}`}
                                                             className="px-2.5 py-1 bg-gray-50 hover:bg-gray-100 dark:bg-stone-800/40 text-gray-500 dark:text-stone-400 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                                                         >
                                                             {t("content.view")}
                                                         </Link>
                                                         <Link
                                                             href={`/content/post/edit/${p._id}`}
                                                             className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
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
                                                    className="w-4 h-4 rounded border-stone-300 dark:border-stone-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                                />
                                            </th>
                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">{t("content.article")}</th>
                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">{t("content.author")}</th>
                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">{t("content.categories")}</th>
                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">{t("profile.status")}</th>
                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">{t("logs.created")}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-200 dark:divide-stone-700/30">
                                        {posts.map(p => (
                                            <tr key={p._id} className="group hover:bg-stone-100 dark:hover:bg-stone-800/40 transition-all">
                                                {/* Checkbox */}
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={selection.isSelected(p._id)}
                                                        onChange={() => selection.toggle(p._id)}
                                                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                                    />
                                                </td>
                                                {/* Article */}
                                                <td className="px-4 py-3 max-w-xs">
                                                    <div className="flex items-start gap-3">
                                                        <div className="h-10 w-10 mr-1 rounded-xl bg-gray-100 dark:bg-stone-800/40 flex-shrink-0 overflow-hidden border border-gray-100 dark:border-stone-700/50">
                                                            {p.featuredImage?.url ? (
                                                                <img src={p.featuredImage.url} className="w-full h-full object-cover" alt={p.title || "Post thumbnail"} />
                                                            ) : (
                                                                <DocumentTextIcon className="w-4 h-4 m-3 text-gray-300" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[220px]">{p.title}</p>
                                                            <p className="text-xs text-gray-400 font-mono truncate">/{p.slug}</p>
                                                            {/* Actions — visible on row hover */}
                                                            <div className="flex items-center gap-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Link
                                                                    href={`/content/post/detail/${p._id}`}
                                                                    className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider hover:underline"
                                                                >
                                                                    <EyeIcon className="w-3 h-3" /> {t("content.view")}
                                                                </Link>
                                                                 <Link
                                                                     href={`/content/post/edit/${p._id}`}
                                                                     className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider hover:underline"
                                                                 >
                                                                     <PencilSquareIcon className="w-3 h-3" /> {t("actions.edit")}
                                                                 </Link>
                                                                 {canDelete && (
                                                                     <button
                                                                         onClick={() => handleDelete(p._id)}
                                                                         className="flex items-center gap-1 text-red-500 dark:text-red-400 text-[10px] font-black uppercase tracking-wider hover:underline"
                                                                     >
                                                                         <TrashIcon className="w-3 h-3" /> {t("content.delete")}
                                                                     </button>
                                                                 )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Author */}
                                                <td className="px-4 py-3">
                                                    <p className="text-xs font-bold text-gray-700 dark:text-stone-300">{p.author?.name || "Unknown"}</p>
                                                    <p className="text-xs text-gray-400 font-mono">{p.author?.email || ""}</p>
                                                </td>

                                                {/* Categories */}
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-wrap gap-1">
                                                        {p.categories?.slice(0, 2).map((cat, i) => (
                                                            <span key={i} className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 px-1.5 py-0.5 rounded text-[9px] font-black uppercase">
                                                                {cat.name}
                                                            </span>
                                                        ))}
                                                        {p.categories && p.categories.length > 2 && (
                                                            <span className="text-xs text-gray-400 font-bold">+{p.categories.length - 2}</span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Status */}
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${p.status === 'published'
                                                        ? (p.published?.at && new Date(p.published.at) > new Date()
                                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                                                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400')
                                                        : p.status === 'archived'
                                                            ? 'bg-gray-100 text-gray-500 dark:bg-stone-800/40 dark:text-stone-400'
                                                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                                                        }`}>
                                                        {p.status === 'published' && p.published?.at && new Date(p.published.at) > new Date() ? t("status.scheduled") : p.status}
                                                    </span>
                                                </td>

                                                {/* Date */}
                                                <td className="px-4 py-3 text-xs text-gray-500 dark:text-stone-400">
                                                    {formatRelativeTime(p.published?.at || p.created.at)}
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

            {/* Bulk Action Bar */}
            {canBulk && (
                <BulkActionBar
                    count={selection.count}
                    actions={[
                        { label: t("actions.publish"), action: "publish", variant: "primary" },
                        { label: t("actions.draft"), action: "draft", variant: "warning" },
                        { label: t("actions.delete"), action: "delete", variant: "danger", confirm: t("common.areYouSure") },
                    ]}
                    onAction={handleBulkAction}
                    onClear={selection.clear}
                />
            )}

            {/* AI Generate Modal */}
            {showGenerateModal && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white dark:bg-stone-900/80 rounded-2xl shadow-2xl border border-gray-200 dark:border-stone-700/50 max-w-sm w-full p-8 text-center">

                        {/* Idle */}
                        {!generateLoading && generateResult === null && (
                            <>
                                <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-5">
                                    <SparklesIcon className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-xl font-black mb-1">Generate Article with AI</h3>
                                <p className="text-gray-500 dark:text-stone-400 text-xs mb-5">Article will be saved as a draft. May take up to 1 minute.</p>

                                <div className="text-left mb-4">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Topic / Query</label>
                                    <textarea
                                        value={generateQuery}
                                        onChange={e => setGenerateQuery(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerate(); }}
                                        placeholder="e.g. Teknologi AI terbaru di Indonesia 2026..."
                                        rows={3}
                                        autoFocus
                                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-stone-700/50 bg-gray-50 dark:bg-stone-800/40 text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-all resize-none"
                                    />
                                    <p className="text-[9px] text-gray-400 mt-1">Tip: Ctrl+Enter to submit</p>
                                </div>

                                {settings.gemini_api_key && (
                                    <div className="flex items-center justify-between bg-gray-50 dark:bg-stone-800/40 rounded-xl px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <SparklesIcon className="w-4 h-4 text-emerald-500" />
                                            <span className="text-xs font-bold text-gray-700 dark:text-stone-300">Generate AI Image</span>
                                        </div>
                                        <Toggle
                                            checked={generateWithImage}
                                            onChange={(e) => setGenerateWithImage(e.target.checked)}
                                        />
                                    </div>
                                )}

                                <div className="flex gap-2 mt-2">
                                    <button
                                        onClick={handleGenerate}
                                        disabled={!generateQuery.trim()}
                                        className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-xl text-xs font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                                    >
                                        <SparklesIcon className="w-4 h-4" /> Generate Now
                                    </button>
                                    <button
                                        onClick={() => setShowGenerateModal(false)}
                                        className="px-4 py-2.5 rounded-xl text-xs font-black bg-gray-100 dark:bg-stone-800/40 hover:bg-gray-200 dark:hover:bg-stone-700 text-gray-600 dark:text-stone-300 transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </>
                        )}

                        {/* Loading */}
                        {generateLoading && (
                            <>
                                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 relative">
                                    <div className="absolute inset-0 rounded-full border-4 border-violet-200 dark:border-violet-800" />
                                    <div className="absolute inset-0 rounded-full border-4 border-t-violet-600 animate-spin" />
                                    <SparklesIcon className="w-7 h-7 text-violet-600" />
                                </div>
                                <h3 className="text-xl font-black mb-1">Generating Article...</h3>
                                <p className="text-gray-500 dark:text-stone-400 text-xs mb-3">
                                    Writing about <span className="font-bold text-violet-600 dark:text-violet-400">&ldquo;{generateQuery}&rdquo;</span>
                                </p>
                                <div className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-xl text-[10px] font-black">
                                    <ClockIcon className="w-3.5 h-3.5" />
                                    {elapsedSeconds < 60
                                        ? `${elapsedSeconds}s — please wait up to 1 minute`
                                        : `${elapsedSeconds}s — almost done...`
                                    }
                                </div>
                                <p className="text-[10px] text-gray-400 mt-3">Do not close this window</p>
                            </>
                        )}

                        {/* Result */}
                        {!generateLoading && generateResult !== null && (() => {
                            const result = generateResult;
                            return (
                                <>
                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${result.success ? 'bg-emerald-100 dark:bg-emerald-950/30' : 'bg-red-100 dark:bg-red-950/30'}`}>
                                        {result.success
                                            ? <CheckCircleIcon className="w-8 h-8 text-emerald-600" />
                                            : <XMarkIcon className="w-8 h-8 text-red-600" />
                                        }
                                    </div>
                                    <h3 className={`text-xl font-black mb-1 ${result.success ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                                        {result.success ? 'Article Created!' : 'Generation Failed'}
                                    </h3>
                                    <p className="text-gray-500 dark:text-stone-400 text-xs mb-5">{result.message}</p>
                                    {result.success && (
                                        <p className="text-[10px] text-gray-400 mb-4">Post list refreshed — check for your new draft above.</p>
                                    )}
                                    <div className="flex gap-2 justify-center">
                                        {result.success ? (
                                            <button
                                                onClick={() => setShowGenerateModal(false)}
                                                className="px-6 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white transition-all"
                                            >
                                                Done
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => setGenerateResult(null)}
                                                    className="flex-1 py-2.5 rounded-xl text-xs font-black bg-violet-600 hover:bg-violet-700 text-white transition-all flex items-center justify-center gap-1.5"
                                                >
                                                    <SparklesIcon className="w-3.5 h-3.5" /> Try Again
                                                </button>
                                                <button
                                                    onClick={() => setShowGenerateModal(false)}
                                                    className="flex-1 py-2.5 rounded-xl text-xs font-black bg-gray-100 dark:bg-stone-800/40 hover:bg-gray-200 dark:hover:bg-stone-700 text-gray-600 dark:text-stone-300 transition-all"
                                                >
                                                    Close
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}
        </>
    );
}