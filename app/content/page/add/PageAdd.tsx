'use client';

import { useCallback, useEffect, useState } from "react";
import ContentEditor from "@/components/editor/ContentEditor";
import slugify from "slugify";
import Link from "next/link";
import {
    ArrowLeftIcon, CheckIcon, XMarkIcon, PhotoIcon,
    GlobeAltIcon, TagIcon, ArrowsUpDownIcon, DocumentIcon
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import FeaturedImagePicker from "@/components/content/FeaturedImagePicker";
import { useAutoSave } from "@/lib/use-auto-save";
import AutoSaveIndicator from "@/components/ui/AutoSaveIndicator";
import { loadDraft, clearDraft } from "@/lib/draft-storage";
import { useT } from "@/components/LanguageProvider";
import { SUPPORTED_LOCALES } from "@/lib/i18n/types";
import { getLocaleLabel } from "@/lib/i18n";
import { wordCount } from "@/lib/text";

interface PageOption {
    _id: string;
    title: string;
    parent?: string | null;
}

export default function PageAdd() {
    const t = useT();
    const router = useRouter();
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

    const handleSelectFeaturedImage = (url: string) => {
        setForm(prev => ({
            ...prev,
            featuredImage: { ...prev.featuredImage, url: url }
        }));
        setPreviewUrl(url);
        setIsMediaModalOpen(false);
    };

    const [form, setForm] = useState({
        title: "",
        slug: "",
        excerpt: "",
        content: "",
        locale: "id_ID",
        menuOrder: 0,
        parent: "" as string, // Single Parent ID
        tags: [] as string[],
        status: "draft",
        menuGroup: "main",
        featuredImage: { url: "", alt: "" },
        meta: { title: "", description: "", keywords: [] as string[] },
    });

    const [pageOptions, setPageOptions] = useState<PageOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [tagInput, setTagInput] = useState("");
    const [previewUrl, setPreviewUrl] = useState<string>("");
    const [isSlugValid, setIsSlugValid] = useState<boolean | null>(null);
    const [checkingSlug, setCheckingSlug] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [showRestorePrompt, setShowRestorePrompt] = useState(false);

    const handleApiSave = useCallback(async (formData: typeof form) => {
        const submitData = {
            ...formData,
            parent: formData.parent || null,
        };
        const res = await fetch("/api/content/page", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...submitData, status: "draft" }),
        });
        if (!res.ok) throw new Error("Auto-save failed");
    }, []);

    const { status: saveStatus, lastSaved, hasDraft, restoreDraft, dismissDraft, forceSave, errorMessage } = useAutoSave({
        form,
        type: "page",
        id: undefined,
        onApiSave: handleApiSave,
    });

    useEffect(() => {
        const draft = loadDraft("page", undefined);
        if (draft && draft.form && (draft.form.title || draft.form.content)) {
            setShowRestorePrompt(true);
        }
    }, []);

    const handleRestoreDraft = () => {
        const draft = loadDraft("page", undefined);
        if (draft && draft.form) {
            const draftForm = draft.form as typeof form;
            setForm(prev => ({ ...prev, ...draftForm }));
            if (draftForm.featuredImage?.url) {
                setPreviewUrl(draftForm.featuredImage.url);
            }
        }
        setShowRestorePrompt(false);
    };

    const handleDismissDraft = () => {
        clearDraft("page", undefined);
        setShowRestorePrompt(false);
    };

    const slugBadgeColor = isSlugValid === true
        ? "bg-emerald-50 text-emerald-600"
        : isSlugValid === false
            ? "bg-red-50 text-red-600"
            : "bg-orange-50 text-orange-600";
    useEffect(() => {
        fetch("/api/content/page?status=published")
            .then(res => res.json())
            .then(data => setPageOptions(data.data || []));
    }, []);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (form.slug) {
                setCheckingSlug(true);
                try {
                    const res = await fetch(`/api/content/page/check-slug?slug=${form.slug}`);
                    const data = await res.json();
                    setIsSlugValid(data.available); // true jika bisa digunakan
                } catch (err) {
                    console.error("Slug check failed");
                } finally {
                    setCheckingSlug(false);
                }
            } else {
                setIsSlugValid(null);
            }
        }, 500); // Tunggu 500ms setelah user berhenti mengetik

        return () => clearTimeout(timer);
    }, [form.slug])

    /* ======================================================
       HANDLERS (Sama dengan PostAdd namun disesuaikan)
    ====================================================== */
    function handleChange(
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) {
        const { name, value, type } = e.target;

        setForm(prev => {
            const newState = { ...prev };

            if (name === "title") {
                newState.title = value;
                newState.slug = slugify(value, { lower: true, strict: true });
                if (!prev.meta.title || prev.meta.title === prev.title)
                    newState.meta.title = value;
                if (!prev.featuredImage.alt || prev.featuredImage.alt === prev.title)
                    newState.featuredImage.alt = value;

            } else if (name === "menuOrder") {
                newState.menuOrder = Number(value) || 0; // ✅ FIX PENTING

            } else if (name === "excerpt") {
                newState.excerpt = value;
                newState.meta.description = value;

            } else if (name.startsWith("meta.")) {
                const field = name.split(".")[1];
                (newState.meta as any)[field] = value;
            } else if (name === "featuredImageAlt") {
                newState.featuredImage = {
                    ...prev.featuredImage,
                    alt: value,
                };
            } else {
                (newState as any)[name] = value;
            }

            return newState;
        });
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => setPreviewUrl(reader.result as string);
        reader.readAsDataURL(file);

        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const result = await res.json();
            if (result.success) {
                await fetch('/api/content/media', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: file.name.replace(/\.[^/.]+$/, ''),
                        path: result.url,
                        mimeType: file.type,
                        extension: file.name.split('.').pop()?.toLowerCase(),
                        size: file.size,
                        dimensions: result.dimensions || null,
                    }),
                });
                setForm(prev => ({ ...prev, featuredImage: { ...prev.featuredImage, url: result.url } }));
            }
        } catch (err) { console.error(err); }
    };

    async function handleSubmit() {
        setLoading(true);
        setSubmitError(null);
        setFieldErrors({});

        try {
            const res = await fetch("/api/content/page", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    parent: form.parent === "" ? null : form.parent,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setSubmitError(data.message || "Gagal menyimpan halaman");

                if (data.fields) {
                    setFieldErrors(data.fields);
                }

                // slug invalid → trigger UI
                if (data.fields?.slug) {
                    setIsSlugValid(false);
                }

                return;
            }

            if (data.success && data.data?._id) {
                clearDraft("page", undefined);
                router.push(`/content/page/detail/${data.data._id}?created=true`);
            } else {
                clearDraft("page", undefined);
                router.push("/content/page");
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-full mx-auto pb-20 space-y-6">
            {/* Draft Restore Prompt */}
            {showRestorePrompt && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                            You have an unsaved draft. Would you like to restore it?
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleDismissDraft} className="px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg">
                            Discard
                        </button>
                        <button onClick={handleRestoreDraft} className="px-3 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg">
                            Restore
                        </button>
                    </div>
                </div>
            )}

            {/* Header Sticky */}
            <div className="sticky top-0 z-10 bg-gray-50/80 dark:bg-stone-900/80 backdrop-blur-md py-4 border-b border-gray-200 dark:border-stone-700/50 -mx-6 md:-mx-8 lg:-mx-10 -mt-6 md:-mt-8 lg:-mt-10 px-6 md:px-8 lg:px-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/content/page" className="btn-action-back">
                            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold">Create New Page</h1>
                            <AutoSaveIndicator status={saveStatus} lastSaved={lastSaved} errorMessage={errorMessage} />
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center justify-between gap-3">
                            <Link href="/content/page" className="btn-action-secondary">
                                {t("common.cancel")}
                            </Link>
                            <div className="flex bg-gray-100 dark:bg-stone-800/40 p-1 rounded-xl">
                                {(["draft", "published"] as const).map(s => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => setForm(prev => ({ ...prev, status: s }))}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${form.status === s ? 'bg-white dark:bg-stone-700 text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                    >
                                        {s.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button onClick={handleSubmit} disabled={loading} className="btn-action-primary">
                            {loading ? "..." : <><CheckIcon className="w-4 h-4" /> Save Page</>}
                        </button>
                    </div>
                </div>
            </div>

            {submitError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm font-bold text-red-700">
                    ❌ {submitError}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT: Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-stone-800/40 rounded-3xl border border-gray-200 dark:border-stone-700/50 overflow-hidden shadow-sm">
                        <div className="px-6 pt-8 pb-4">
                            <input
                                name="title"
                                value={form.title}
                                onChange={handleChange}
                                placeholder="Page Title..."
                                className="w-full text-4xl font-black bg-transparent border-none focus:ring-0 focus:outline-none placeholder:text-gray-200 dark:placeholder:text-stone-500"
                            />
                        </div>
                        <div className="px-6 pb-4">
                            <div className={"flex items-center gap-3 text-xs font-bold px-4 py-2 rounded-xl w-fit transition-all " + slugBadgeColor}>
                                {checkingSlug ? (
                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : isSlugValid === false ? (
                                    <XMarkIcon className="w-4 h-4" />
                                ) : (
                                    <GlobeAltIcon className="w-4 h-4" />
                                )}
                                <span>{APP_URL + "/" + form.slug}</span>
                            </div>

                            {isSlugValid === false && (
                                <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight ml-1">
                                    ⚠️ This slug is already taken. Please use a different title.
                                </p>
                            )}
                        </div>
                        <div className="px-6 mt-4 pb-6">
                            <ContentEditor
                                value={form.content}
                                onChange={(html) => setForm(prev => ({ ...prev, content: html }))}
                            />
                        </div>
                        <div className="px-6 py-3 border-t border-stone-200 dark:border-stone-700/50 text-[10px] font-semibold text-gray-400 dark:text-stone-500 flex items-center justify-between">
                            <span>{wordCount(form.content)} words</span>
                            <span>{form.content.length} characters</span>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Sidebar */}
                <div className="space-y-6">
                    {/* Hierarchy Selector & Order */}
                    <div className="bg-white dark:bg-stone-800/40 p-6 rounded-3xl border border-gray-200 dark:border-stone-700/50 shadow-sm space-y-5">
                        <h3 className="font-bold mb-4 flex items-center gap-2 text-gray-800 dark:text-stone-100">
                            <ArrowsUpDownIcon className="w-5 h-5 text-orange-500" /> Page Hierarchy
                        </h3>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Parent Page</label>
                            <select
                                name="parent"
                                value={form.parent}
                                onChange={handleChange}
                                className="w-full mt-1.5 p-3 bg-gray-50 dark:bg-stone-900/80 border border-gray-100 dark:border-stone-700/50 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-orange-500 appearance-none"
                            >
                                <option value="">None (Top Level)</option>
                                {pageOptions.map(opt => (
                                    <option key={opt._id} value={opt._id}>{opt.title}</option>
                                ))}
                            </select>
                        </div>

                        {/* MENU GROUP */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Menu Group</label>
                            <select
                                name="menuGroup"
                                value={form.menuGroup}
                                onChange={handleChange}
                                className="w-full mt-1.5 p-3 bg-gray-50 dark:bg-stone-900/80 border border-gray-100 dark:border-stone-700/50 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-orange-500 appearance-none"
                            >
                                <option value="main">Main Menu (Header)</option>
                                <option value="secondary">Secondary (Footer)</option>
                                <option value="third">Third Menu (Sidebar)</option>
                            </select>
                        </div>

                        {/* INPUT MENU ORDER */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Display Order Index</label>
                            <div className="relative mt-1.5">
                                <input
                                    type="number"
                                    name="menuOrder"
                                    value={form.menuOrder}
                                    onChange={handleChange}
                                    placeholder="0"
                                    className="w-full p-3 bg-gray-50 dark:bg-stone-900/80 border border-gray-100 dark:border-stone-700/50 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-300 uppercase">Index</span>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-2">Halaman dengan nomor lebih kecil akan muncul lebih awal di menu.</p>
                        </div>
                    </div>

                    {/* Language Card */}
                    <div className="bg-white dark:bg-stone-800/40 p-6 rounded-3xl border border-gray-200 dark:border-stone-700/50 shadow-sm space-y-4">
                        <h3 className="font-bold flex items-center gap-2 text-gray-800 dark:text-stone-100">
                            <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                            </svg>
                            {t("content.language")}
                        </h3>
                        <select
                            name="locale"
                            value={form.locale}
                            onChange={handleChange}
                            className="w-full mt-1.5 p-3 bg-gray-50 dark:bg-stone-900/80 border border-gray-100 dark:border-stone-700/50 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-orange-500 appearance-none"
                        >
                            {SUPPORTED_LOCALES.map(loc => (
                                <option key={loc} value={loc}>{getLocaleLabel(loc as "en_US" | "id_ID")}</option>
                            ))}
                        </select>
                    </div>

                    {/* Featured Image Card */}
                    <FeaturedImagePicker
                        value={form.featuredImage.url}
                        alt={form.featuredImage.alt}
                        title={form.title}
                        onChange={(data) => setForm(prev => ({ ...prev, featuredImage: data }))}
                    />

                    {/* Taxonomy & Tags */}
                    <div className="bg-white dark:bg-stone-800/40 p-6 rounded-3xl border border-gray-200 dark:border-stone-700/50 shadow-sm space-y-6">
                        <h3 className="font-bold flex items-center gap-2">
                            <TagIcon className="w-5 h-5 text-emerald-500" /> Page Tags
                        </h3>

                        <div className="space-y-3">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={tagInput}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val.includes(',')) {
                                            const newTag = val.replace(',', '').trim();
                                            if (newTag && !form.tags.includes(newTag)) {
                                                setForm(prev => ({ ...prev, tags: [...prev.tags, newTag] }));
                                            }
                                            setTagInput("");
                                        } else {
                                            setTagInput(val);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
                                                setForm(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
                                                setTagInput("");
                                            }
                                        }
                                    }}
                                    placeholder="SEO Keywords (Enter)..."
                                    className="flex-1 text-xs p-3 bg-gray-50 dark:bg-stone-900/80 border border-gray-100 dark:border-stone-700/50 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>

                            <div className="flex flex-wrap gap-2 min-h-[20px]">
                                {form.tags.map((tag, idx) => (
                                    <span key={idx} className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-black rounded-lg border border-emerald-100 dark:border-emerald-800 tracking-wider">
                                        {tag}
                                        <button type="button" onClick={() => setForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))}>
                                            <XMarkIcon className="w-3 h-3 hover:text-red-500" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* SEO Card */}
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-2xl p-5 space-y-4">
                        <h3 className="font-bold flex items-center gap-2 text-amber-700 dark:text-amber-300">
                            <GlobeAltIcon className="w-5 h-5" /> SEO Settings
                        </h3>
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-amber-600/70 dark:text-amber-400/70">{t("content.metaTitle")}</label>
                                <input
                                    name="meta.title"
                                    value={form.meta.title}
                                    onChange={handleChange}
                                    className="w-full bg-white/70 dark:bg-stone-800/40 border border-amber-200/50 dark:border-amber-900/30 rounded-xl p-3 text-sm outline-none placeholder:text-amber-400/40 focus:ring-1 focus:ring-amber-500"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-amber-600/70 dark:text-amber-400/70">{t("content.metaDescription")}</label>
                                <textarea
                                    name="excerpt"
                                    value={form.excerpt}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full bg-white/70 dark:bg-stone-800/40 border border-amber-200/50 dark:border-amber-900/30 rounded-xl p-3 text-sm outline-none resize-none focus:ring-1 focus:ring-amber-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}