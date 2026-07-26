'use client';

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeftIcon,
    PencilSquareIcon,
    TrashIcon,
    RocketLaunchIcon,
    CheckCircleIcon,
    ClockIcon,
    XMarkIcon,
    GlobeAltIcon,
    CalendarIcon,
    UserIcon,
    TagIcon,
    DocumentDuplicateIcon,
    ArrowsUpDownIcon,
    InformationCircleIcon,
} from "@heroicons/react/24/outline";

interface Page {
    _id: string;
    title: string;
    slug: string;
    excerpt?: string;
    content: string;
    status: "draft" | "published" | "archived";
    menuOrder: number;
    locale?: string;

    parent?: {
        _id: string;
        title: string;
    } | null;

    featuredImage?: {
        url?: string;
        alt?: string;
    };

    tags: string[];

    meta: {
        title?: string;
        description?: string;
        keywords?: string[];
        canonicalUrl?: string;
    };

    author?: {
        _id: string;
        name: string;
    };

    created: {
        at: string;
        by?: { name: string };
    };

    updated: {
        at: string;
        by?: { name: string };
    };

    published?: {
        at?: string;
        by?: { name: string };
    };

    menuGroup?: string;
}

export default function PageDetail({ id }: { id: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [page, setPage] = useState<Page | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState("");

    useEffect(() => {
        fetchPage();
        if (searchParams.get("created") === "true") {
            setAlertMessage("Page created successfully");
            setShowSuccessAlert(true);
            setTimeout(() => setShowSuccessAlert(false), 5000);
        } else if (searchParams.get("updated") === "true") {
            setAlertMessage("Page updated successfully");
            setShowSuccessAlert(true);
            setTimeout(() => setShowSuccessAlert(false), 5000);
        }
    }, [id, searchParams]);

    async function fetchPage() {
        setLoading(true);
        try {
            const res = await fetch(`/api/content/page?id=${id}`);
            const json = await res.json();
            if (json.success) setPage(json.data);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    }

    async function handlePublish() {
        setActionLoading(true);
        await fetch(`/api/content/page`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, status: "published" }),
        });
        setShowPublishModal(false);
        fetchPage();
        setActionLoading(false);
    }

    async function handleDelete() {
        setActionLoading(true);
        await fetch(`/api/content/page?id=${id}`, { method: "DELETE" });
        router.push("/content/page");
        setActionLoading(false);
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 text-sm font-medium animate-pulse">
                    Loading Page Detail...
                </p>
            </div>
        );
    }

    if (!page) {
        return (
            <div className="text-center py-20 bg-white dark:bg-stone-800/40 rounded-2xl border border-dashed border-gray-300 dark:border-stone-700/50">
                <InformationCircleIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Page not found.</p>
                <Link href="/content/page" className="btn-action-secondary mt-6 inline-block">
                    Back to Pages
                </Link>
            </div>
        );
    }
    return (
        <>
            {/* Success Toast */}
            {showSuccessAlert && (
                <div className="fixed top-6 right-6 z-[60] animate-slide-in-right">
                    <div className="bg-emerald-600 text-white rounded-2xl p-4 shadow-2xl flex items-center gap-4 min-w-[300px]">
                        <CheckCircleIcon className="w-8 h-8 opacity-80" />
                        <div>
                            <p className="font-bold">Success</p>
                            <p className="text-xs opacity-90">
                                {alertMessage}
                            </p>
                        </div>
                        <button
                            onClick={() => setShowSuccessAlert(false)}
                            className="ml-auto p-1 hover:bg-white/20 rounded-lg"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            <div className="max-w-full mx-auto pb-20 space-y-6">
                {/* Sticky Header */}
                <div className="sticky top-0 z-40 bg-gray-50/80 dark:bg-stone-900/80 backdrop-blur-md py-4 border-b border-stone-200 dark:border-stone-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 -mx-6 md:-mx-8 lg:-mx-10 -mt-6 md:-mt-8 lg:-mt-10 px-6 md:px-8 lg:px-10">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/content/page"
                            className="btn-action-back"
                        >
                            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold truncate max-w-[200px] sm:max-w-md">
                                    {page.title}
                                </h1>
                                <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${page.status === "published"
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-emerald-100 text-emerald-700"
                                        }`}
                                >
                                    {page.status}
                                </span>
                                {page.locale && (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-200">
                                        {page.locale === "en_US" ? "English" : page.locale === "id_ID" ? "Indonesian" : page.locale}
                                    </span>
                                )}
                            </div>
                            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                                Static Page
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {page.status !== "published" && (
                            <button
                                onClick={() => setShowPublishModal(true)}
                                className="btn-action-primary"
                            >
                                <RocketLaunchIcon className="w-4 h-4" />
                                Publish
                            </button>
                        )}
                        <Link
                            href={`/content/page/edit/${page._id}`}
                            className="btn-action-secondary"
                        >
                            <PencilSquareIcon className="w-4 h-4 text-emerald-600" />
                            Edit Page
                        </Link>
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="btn-action-danger-icon"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white dark:bg-stone-800/40 rounded-3xl border border-gray-200 dark:border-stone-700/50 overflow-hidden shadow-sm">
                            {page.featuredImage?.url && (
                                <div className="aspect-video relative">
                                    <img
                                        src={page.featuredImage.url}
                                        alt={page.featuredImage.alt || page.title}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
                                        <h2 className="text-3xl font-bold text-white">
                                            {page.title}
                                        </h2>
                                    </div>
                                </div>
                            )}

                            <div className="p-8 space-y-8">
                                {!page.featuredImage?.url && (
                                    <h2 className="text-3xl font-bold text-gray-900 dark:text-stone-100">{page.title}</h2>
                                )}

                                <div className="flex flex-wrap gap-3 text-xs">
                                    <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl">
                                        <GlobeAltIcon className="w-4 h-4" />
                                        /{page.slug}
                                    </div>

                                    {page.parent && (
                                        <div className="flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-xl">
                                            <DocumentDuplicateIcon className="w-4 h-4" />
                                            Parent: {page.parent.title}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl">
                                        <ArrowsUpDownIcon className="w-4 h-4" />
                                        Order: {page.menuOrder}
                                    </div>
                                </div>

                                {page.excerpt && (
                                    <div className="p-5 bg-gray-50 rounded-2xl border-l-4 border-emerald-500">
                                        <p className="italic text-gray-600">{page.excerpt}</p>
                                    </div>
                                )}

                                <div className="prose prose-orange max-w-none">
                                    <div className="prose prose-lg dark:prose-invert prose-orange max-w-none prose-headings:font-bold prose-a:text-emerald-600 prose-img:rounded-3xl prose-pre:bg-gray-900" dangerouslySetInnerHTML={{ __html: page.content }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-stone-800/40 rounded-2xl border border-gray-200 dark:border-stone-700/50 p-6 space-y-5">
                            <h3 className="font-bold flex items-center gap-2 border-b pb-3">
                                <InformationCircleIcon className="w-5 h-5 text-emerald-500" />
                                Page Info
                            </h3>

                            <div className="flex items-center gap-3">
                                <UserIcon className="w-5 h-5 text-gray-400" />
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-gray-400">
                                        Author
                                    </p>
                                    <p className="text-sm font-medium">
                                        {page.author?.name || "Admin"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <CalendarIcon className="w-5 h-5 text-gray-400" />
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-gray-400">
                                        Updated
                                    </p>
                                    <p className="text-sm font-medium">
                                        {new Date(page.updated.at).toLocaleDateString("id-ID", {
                                            dateStyle: "long",
                                        })}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <ArrowsUpDownIcon className="w-5 h-5 text-gray-400" />
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-gray-400">
                                        Menu Group
                                    </p>
                                    <p className="text-sm font-medium capitalize">
                                        {page.menuGroup || "Main"}
                                    </p>
                                </div>
                            </div>

                        </div>

                        <div className="bg-white dark:bg-stone-800/40 rounded-2xl border border-gray-200 dark:border-stone-700/50 p-6 space-y-5 shadow-sm">
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2"><TagIcon className="w-4 h-4" /> Tags</h4>
                                <div className="flex flex-wrap gap-2">
                                    {page.tags.map((tag, i) => (
                                        <span key={i} className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold uppercase">#{tag}</span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* SEO Overview */}
                        <div className="bg-gradient-to-br from-emerald-50 to-emerald-50 dark:from-emerald-950/30 dark:to-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 rounded-2xl p-6 space-y-4">
                            <h3 className="font-semibold flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                                <GlobeAltIcon className="w-5 h-5" />
                                SEO Overview
                            </h3>
                            <div className="bg-white/70 dark:bg-stone-800/40 p-3 rounded-xl border border-emerald-200/50 dark:border-emerald-900/30">
                                <p className="text-[10px] uppercase font-bold text-emerald-600/70 dark:text-emerald-400/70">
                                    Meta Title
                                </p>
                                <p className="text-sm font-medium text-stone-800 dark:text-stone-100 line-clamp-1 mt-0.5">
                                    {page.meta.title || page.title}
                                </p>
                            </div>
                            <div className="bg-white/70 dark:bg-stone-800/40 p-3 rounded-xl border border-emerald-200/50 dark:border-emerald-900/30">
                                <p className="text-[10px] uppercase font-bold text-emerald-600/70 dark:text-emerald-400/70">
                                    Meta Description
                                </p>
                                <p className="text-xs text-stone-600 dark:text-stone-300 line-clamp-3 mt-0.5">
                                    {page.meta.description || page.excerpt || "No meta description"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Publish */}
            {showPublishModal && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white dark:bg-stone-800/40 rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center animate-scale-in">
                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <RocketLaunchIcon className="w-10 h-10 text-emerald-600" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Publish Post?</h3>
                        <p className="text-gray-500 text-sm mb-8">This will make your content visible to everyone on the website.</p>
                        <div className="flex gap-3">
                            <button onClick={handlePublish} disabled={actionLoading} className="btn-modal-primary">
                                {actionLoading ? 'Publishing...' : 'Yes, Publish'}
                            </button>
                            <button onClick={() => setShowPublishModal(false)} className="btn-modal-secondary">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Delete */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white dark:bg-stone-800/40 rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center animate-scale-in">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <TrashIcon className="w-10 h-10 text-red-600" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Delete Post?</h3>
                        <p className="text-gray-500 text-sm mb-8">This action is permanent and cannot be undone. Are you sure?</p>
                        <div className="flex gap-3">
                            <button onClick={handleDelete} disabled={actionLoading} className="btn-modal-danger">
                                {actionLoading ? 'Deleting...' : 'Delete Now'}
                            </button>
                            <button onClick={() => setShowDeleteModal(false)} className="btn-modal-secondary">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                @keyframes slide-in-right {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes scale-in {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .animate-slide-in-right { animation: slide-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
                .animate-scale-in { animation: scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
            `}</style>
        </>
    );
}