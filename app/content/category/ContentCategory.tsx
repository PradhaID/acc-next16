'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    PlusIcon,
    PencilSquareIcon,
    FolderIcon,
    InboxIcon,
    ChevronLeftIcon,
    ChevronRightIcon
} from "@heroicons/react/24/outline";
import PageHeader from "@/components/ui/PageHeader";
import SearchInput from "@/components/ui/SearchInput";
import { useSelection } from "@/lib/use-selection";
import BulkActionBar from "@/components/ui/BulkActionBar";
import { useT } from "@/components/LanguageProvider";
import { usePermission } from "@/hooks/useSession";
import { ROLES } from "@/lib/roles";

interface ContentCategory {
    _id: string;
    name: string;
    slug: string;
    description?: string;
    isActive: boolean;
    parent?: {
        _id: string;
        name: string;
    } | null;
    structuredData?: {
        image?: string;
    };
}

export default function ContentCategoryPage() {
    const t = useT();
    const canCreate = usePermission(ROLES.CREATE_CATEGORY);
    const canBulk = usePermission(ROLES.BULK_CATEGORY);
    const [categories, setCategories] = useState<ContentCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    const pageSize = 9; // Grid friendly multiplier

    useEffect(() => {
        fetchCategories();
    }, []);

    async function fetchCategories() {
        setLoading(true);
        const res = await fetch("/api/content/category?active=true&all=true");
        const json = await res.json();
        setCategories(json.data || []);
        setLoading(false);
    }

    const filtered = categories.filter(cat =>
        cat.name.toLowerCase().includes(search.toLowerCase()) ||
        cat.slug.toLowerCase().includes(search.toLowerCase()) ||
        (cat.description && cat.description.toLowerCase().includes(search.toLowerCase()))
    );

    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
    const totalPages = Math.ceil(filtered.length / pageSize);
    const catIds = paginated.map(c => c._id);
    const selection = useSelection(catIds);

    async function handleBulkAction(action: string) {
        const ids = Array.from(selection.selected);
        if (action === "delete") {
            if (!confirm(`Delete ${ids.length} categories?`)) return;
        }
        const res = await fetch("/api/content/category/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: action === "delete" ? "delete" : "status", ids, value: action === "activate" ? "true" : action === "deactivate" ? "false" : undefined }),
        });
        if (res.ok) {
            selection.clear();
            fetchCategories();
        }
    }

    return (
        <>
        <div className="max-w-full mx-auto space-y-4 pb-10">
            {/* Header */}
            <PageHeader
                title={t("content.categoriesTitle")}
                subtitle={t("content.categoriesSubtitle")}
                actions={
                    canCreate && (
                        <Link
                            href="/content/category/add"
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:scale-105 active:scale-95 text-xs text-white px-3 py-2 rounded-xl font-bold shadow-md shadow-orange-500/10 transition-all"
                        >
                            <PlusIcon className="w-4 h-4 stroke-[3px]" />
                            {t("content.addCategory")}
                        </Link>
                    )
                }
            />

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                    { label: "Total Categories", value: categories.length },
                    { label: "Active", value: categories.filter(c => c.isActive).length },
                    { label: "Parent Categories", value: categories.filter(c => !c.parent).length }
                ].map((stat, i) => (
                    <div
                        key={i}
                        className="p-4 rounded-2xl bg-white dark:bg-stone-900/80 border border-gray-200 dark:border-stone-700/50 shadow-sm"
                    >
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            {stat.label}
                        </p>
                        <p className="text-xl font-black text-orange-600 mt-0.5">
                            {stat.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Search Input wrapper matching user/group filter bar style */}
            <div className="bg-white dark:bg-stone-900/80 p-2 rounded-2xl border border-gray-200 dark:border-stone-700/50 shadow-sm flex items-center gap-2">
                <input
                    type="checkbox"
                    checked={selection.isAllSelected}
                    onChange={selection.toggleAll}
                    className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer shrink-0 ml-1"
                />
                <SearchInput
                    value={search}
                    onChange={(v) => { setSearch(v); setPage(1); }}
                    placeholder={t("content.searchCategories")}
                />
            </div>

            {/* Grid of Cards (Aligning to System Groups layout) */}
            <div className="bg-white dark:bg-stone-900/80 border border-gray-200 dark:border-stone-700/50 rounded-2xl overflow-hidden shadow-sm">
                {loading ? (
                    <div className="py-20 text-center">
                        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-400 font-medium text-xs">{t("content.loadingCategories")}</p>
                    </div>
                ) : paginated.length === 0 ? (
                    <div className="py-20 text-center">
                        <InboxIcon className="w-12 h-12 text-gray-300 dark:text-stone-400 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm font-medium">No categories found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 lg:divide-y-0 divide-gray-100 dark:divide-stone-700/30">
                        {paginated.map((cat, index) => {
                            // Border adjustments to match grid divide classes precisely
                            const borderClass = "p-5 flex flex-col justify-between hover:bg-gray-50 dark:hover:bg-stone-800/30 transition-colors border-gray-100 dark:border-stone-700/50 md:border-r last:border-r-0";
                            return (
                                <div key={cat._id} className={`${borderClass} group`}>
                                    <div>
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <input
                                            type="checkbox"
                                            checked={selection.isSelected(cat._id)}
                                            onChange={() => selection.toggle(cat._id)}
                                            className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer shrink-0"
                                        />
                                        <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/20 flex-shrink-0 flex items-center justify-center border border-orange-100 dark:border-orange-900/50">
                                                    {cat.structuredData?.image ? (
                                                        <img src={cat.structuredData.image} className="w-full h-full object-cover rounded-xl" alt="" />
                                                    ) : (
                                                        <FolderIcon className="w-5 h-5 text-orange-600" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                                                        {cat.name}
                                                    </h3>
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        /category/{cat.slug}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border shrink-0 ${
                                                cat.isActive
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400"
                                                    : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400"
                                            }`}>
                                                {cat.isActive ? "Active" : "Disabled"}
                                            </span>
                                        </div>

                                        {cat.parent && (
                                            <div className="mb-3 text-[10px] font-black text-stone-500 bg-stone-100 dark:bg-stone-800/60 px-2 py-0.5 rounded w-fit">
                                                Parent: {cat.parent.name}
                                            </div>
                                        )}

                                        <p className="text-xs text-gray-500 dark:text-stone-400 line-clamp-2 mb-4 h-8">
                                            {cat.description || <span className="italic text-gray-300 dark:text-stone-400">{t("content.noDescription")}</span>}
                                        </p>
                                    </div>
                                    <div className="pt-2 border-t border-gray-50 dark:border-stone-700/50 flex justify-end">
                                        <Link
                                            href={`/content/category/edit/${cat._id}`}
                                            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-orange-600 hover:text-orange-700 md:opacity-0 md:translate-y-1 md:group-hover:opacity-100 md:group-hover:translate-y-0 transition-all duration-200"
                                        >
                                            <PencilSquareIcon className="w-3.5 h-3.5" />
                                            Edit
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination footer */}
                {totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-stone-200 dark:border-stone-700/50 flex items-center justify-between">
                        <span className="text-[10px] font-black text-stone-500 dark:text-stone-400 uppercase tracking-widest">
                            Page {page} of {totalPages}
                        </span>
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
                        { label: "Activate", action: "activate", variant: "primary" },
                        { label: "Deactivate", action: "deactivate", variant: "warning" },
                        { label: t("content.delete"), action: "delete", variant: "danger", confirm: t("common.areYouSure") },
                    ]}
                    onAction={handleBulkAction}
                    onClear={selection.clear}
                />
            )}

        </>
    );
}