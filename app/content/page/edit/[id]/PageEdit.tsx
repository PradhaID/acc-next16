'use client';

import { useCallback, useEffect, useState } from "react";
import ContentEditor from "@/components/editor/ContentEditor";
import slugify from "slugify";
import Link from "next/link";
import {
    ArrowLeftIcon, CheckIcon, XMarkIcon, PhotoIcon,
    GlobeAltIcon, TagIcon, ArrowsUpDownIcon, SparklesIcon
} from "@heroicons/react/24/outline";
import { useParams, useRouter } from "next/navigation";
import FeaturedImagePicker from "@/components/content/FeaturedImagePicker";
import { useAutoSave } from "@/lib/use-auto-save";
import AutoSaveIndicator from "@/components/ui/AutoSaveIndicator";
import { loadDraft, clearDraft } from "@/lib/draft-storage";
import { useT } from "@/components/LanguageProvider";
import { SUPPORTED_LOCALES } from "@/lib/i18n/types";
import { getLocaleLabel } from "@/lib/i18n";
import { useSettings } from "@/lib/settings-context";
import { wordCount } from "@/lib/text";
import { usePermission } from "@/hooks/useSession";
import { ROLES } from "@/lib/roles";

interface PageOption {
    _id: string;
    title: string;
}

export default function PageEdit() {
    const t = useT();
    const router = useRouter();
    const pageSettings = useSettings();
    const aiConfigured = !!(pageSettings.ai_url && pageSettings.ai_api_key && pageSettings.ai_model && pageSettings.searxng_url);
    const canEdit = usePermission(ROLES.EDIT_PAGE);
    const canFix = usePermission(ROLES.FIX_PAGE);
    const { id: rawId } = useParams();
    const id = rawId as string;
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

    const [originalSlug, setOriginalSlug] = useState("");
    const [loading, setLoading] = useState(false);
    const [pageLoaded, setPageLoaded] = useState(false);
    const [previewUrl, setPreviewUrl] = useState("");
    const [tagInput, setTagInput] = useState("");
    const [showRestorePrompt, setShowRestorePrompt] = useState(false);

    // Fix by AI state
    const [fixModalOpen, setFixModalOpen] = useState(false);
    const [fixInstruction, setFixInstruction] = useState("");
    const [fixLoading, setFixLoading] = useState(false);
    const [fixResult, setFixResult] = useState<{
        original: { title: string; content: string; excerpt: string; tags: string[]; categoryName: string };
        suggested: { title: string; content: string; excerpt: string; tags: string[]; categoryNames: string[]; changes_summary: string };
    } | null>(null);

    const [form, setForm] = useState({
        title: "",
        slug: "",
        excerpt: "",
        content: "",
        menuOrder: 0,
        parent: "",
        tags: [] as string[],
        status: "draft",
        menuGroup: "main",
        isActive: true,
        locale: "id_ID",
        featuredImage: { url: "", alt: "" },
        meta: { title: "", description: "", keywords: [] as string[] },
    });

    const [pageOptions, setPageOptions] = useState<PageOption[]>([]);

    const handleApiSave = useCallback(async (formData: typeof form) => {
        const submitData = {
            id,
            ...formData,
            parent: formData.parent || null,
        };
        const res = await fetch(`/api/content/page?id=${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(submitData),
        });
        if (!res.ok) throw new Error("Auto-save failed");
    }, [id]);

    const { status: saveStatus, lastSaved, hasDraft, restoreDraft, dismissDraft, forceSave, errorMessage } = useAutoSave({
        form,
        type: "page",
        id,
        onApiSave: handleApiSave,
    });

    useEffect(() => {
        const draft = loadDraft("page", id);
        if (draft && draft.form && (draft.form.title || draft.form.content)) {
            setShowRestorePrompt(true);
        }
    }, [id]);

    const handleRestoreDraft = () => {
        const draft = loadDraft("page", id);
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
        clearDraft("page", id);
        setShowRestorePrompt(false);
    };

    /* ======================================================
       FETCH PAGE DATA
    ====================================================== */
    useEffect(() => {
        async function fetchPage() {
            const res = await fetch(`/api/content/page?id=${id}`);
            const json = await res.json();

            if (!res.ok) return;

            const page = json.data;

            setForm({
                title: page.title || "",
                slug: page.slug || "",
                parent: page.parent?._id ?? "",
                excerpt: page.excerpt || "",
                content: page.content || "",
                menuOrder: page.menuOrder ?? 0,
                tags: page.tags || [],
                status: page.status || "draft",
                menuGroup: page.menuGroup || "main",
                isActive: page.isActive ?? true,
                locale: page.locale || "id_ID",
                featuredImage: page.featuredImage || { url: "", alt: "" },
                meta: {
                    title: page.meta?.title || "",
                    description: page.meta?.description || "",
                    keywords: page.meta?.keywords || [],
                },
            });

            if (page.featuredImage?.url) {
                setPreviewUrl(page.featuredImage.url);
            }
            setPageLoaded(true);
        }

        fetchPage();
    }, [id]);

    /* ======================================================
       FETCH PARENT OPTIONS
    ====================================================== */
    useEffect(() => {
        fetch("/api/content/page?status=published")
            .then(res => res.json())
            .then(data => setPageOptions(data.data || []));
    }, []);

    /* ======================================================
       HANDLER
    ====================================================== */
    function handleChange(
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) {
        const { name, value } = e.target;

        setForm(prev => {
            const next = { ...prev };

            if (name === "title") {
                next.title = value;
                next.slug = slugify(value, { lower: true, strict: true });
                if (!prev.meta.title || prev.meta.title === prev.title)
                    next.meta.title = value;
            } else if (name === "menuOrder") {
                next.menuOrder = Number(value) || 0;
            } else if (name === "excerpt") {
                next.excerpt = value;
                next.meta.description = value;
            } else if (name.startsWith("meta.")) {
                const field = name.split(".")[1];
                (next.meta as any)[field] = value;
            } else if (name === "featuredImageAlt") {
                next.featuredImage.alt = value;
            } else {
                (next as any)[name] = value;
            }

            return next;
        });
    }

    /* ======================================================
       IMAGE UPLOAD
    ====================================================== */
    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => setPreviewUrl(reader.result as string);
        reader.readAsDataURL(file);

        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();

        if (data.success) {
            await fetch('/api/content/media', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: file.name.replace(/\.[^/.]+$/, ''),
                    path: data.url,
                    mimeType: file.type,
                    extension: file.name.split('.').pop()?.toLowerCase(),
                    size: file.size,
                    dimensions: data.dimensions || null,
                }),
            });
            setForm(p => ({
                ...p,
                featuredImage: { ...p.featuredImage, url: data.url },
            }));
        }
    }

    /* ======================================================
       FIX BY AI
    ====================================================== */
    async function handleFixByAI(instruction: string) {
        setFixLoading(true);
        setFixResult(null);
        try {
            // Pages use the same fix-by-ai endpoint but tagged as a page
            const res = await fetch("/api/content/post/fix-by-ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ postId: id, type: "page", instruction: `[PAGE] ${instruction}` }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.message || "Fix failed");
            setFixResult(json);
        } catch (e: any) {
            alert(e.message || "AI fix failed");
        } finally {
            setFixLoading(false);
        }
    }

    function applyFixResult() {
        if (!fixResult) return;
        const s = fixResult.suggested;
        setForm(prev => ({
            ...prev,
            title: s.title,
            content: s.content,
            excerpt: s.excerpt,
            tags: s.tags,
        }));
        setFixModalOpen(false);
        setFixResult(null);
        setFixInstruction("");
    }

    /* ======================================================
       SUBMIT UPDATE
    ====================================================== */
    async function handleSubmit() {
        setLoading(true);

        await fetch(`/api/content/page?id=${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: id,
                ...form,
                parent: form.parent || null,
            }),
        });

        clearDraft("page", id);
        router.push(`/content/page/detail/${id}?updated=true`);
    }

    if (!pageLoaded) return null;

    /* ======================================================
       RENDER
    ====================================================== */
    return (
        <div className="max-w-full mx-auto pb-20 space-y-6">
            {/* Draft Restore Prompt */}
            {showRestorePrompt && (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                        <p className="text-sm text-emerald-800 dark:text-emerald-200">
                            You have an unsaved draft. Would you like to restore it?
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleDismissDraft} className="px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg">
                            Discard
                        </button>
                        <button onClick={handleRestoreDraft} className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg">
                            Restore
                        </button>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <div className="sticky top-0 z-10 bg-gray-50/80 dark:bg-stone-900/80 backdrop-blur-md py-4 border-b border-gray-200 dark:border-stone-700/50 -mx-6 md:-mx-8 lg:-mx-10 -mt-6 md:-mt-8 lg:-mt-10 px-6 md:px-8 lg:px-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/content/page" className="btn-action-back">
                            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold">{form.title || 'Edit Page'}</h1>
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
                                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${form.status === s ? 'bg-white dark:bg-stone-700 text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                    >
                                        {s.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !canEdit}
                            className="btn-action-primary"
                        >
                            {loading ? "..." : <><CheckIcon className="w-4 h-4" /> Save Page</>}
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* MAIN */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-stone-800/40 rounded-3xl border border-gray-200 dark:border-stone-700/50 overflow-hidden shadow-sm">
                        {/* TITLE */}
                        <div className="px-6 pt-8 pb-4">
                            <input
                                name="title"
                                value={form.title}
                                onChange={handleChange}
                                placeholder="Page Title..."
                                className="w-full text-4xl font-black bg-transparent border-none focus:ring-0 focus:outline-none placeholder:text-gray-200 dark:placeholder:text-stone-500"
                            />
                        </div>

                        {/* SLUG */}
                        <div className="px-6 pb-4">
                            <div className="flex items-center gap-3 text-xs font-bold px-4 py-2 rounded-xl w-fit bg-emerald-50 text-emerald-600">
                                <GlobeAltIcon className="w-4 h-4" />
                                <span>{`${APP_URL}/${form.slug}`}</span>
                            </div>
                        </div>

                        {/* CONTENT */}
                        <div className="px-6 mt-4 pb-6">
                            <ContentEditor
                                value={form.content}
                                onChange={html => setForm(p => ({ ...p, content: html }))}
                            />
                        </div>
                        <div className="px-6 py-3 border-t border-stone-200 dark:border-stone-700/50 text-[10px] font-semibold text-gray-400 dark:text-stone-500 flex items-center justify-between">
                            <span>{wordCount(form.content)} words</span>
                            <span>{form.content.length} characters</span>
                        </div>
                    </div>
                </div>

                {/* SIDEBAR */}
                <div className="space-y-6">

                    {/* HIERARCHY */}
                    <div className="bg-white dark:bg-stone-800/40 p-6 rounded-3xl border border-gray-200 dark:border-stone-700/50 shadow-sm space-y-5">
                        <h3 className="font-bold mb-4 flex items-center gap-2 text-gray-800 dark:text-stone-100">
                            <ArrowsUpDownIcon className="w-5 h-5 text-emerald-500" /> Page Hierarchy
                        </h3>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Parent Page</label>
                            <select
                                name="parent"
                                value={form.parent}
                                onChange={handleChange}
                                className="w-full mt-1.5 p-3 bg-gray-50 dark:bg-stone-900/80 border border-gray-100 dark:border-stone-700/50 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
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
                                className="w-full mt-1.5 p-3 bg-gray-50 dark:bg-stone-900/80 border border-gray-100 dark:border-stone-700/50 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
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
                                    className="w-full p-3 bg-gray-50 dark:bg-stone-900/80 border border-gray-100 dark:border-stone-700/50 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-300 uppercase">Index</span>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-2">Halaman dengan nomor lebih kecil akan muncul lebih awal di menu.</p>
                        </div>
                    </div>

                    {/* AI Fix */}
                    {aiConfigured && canFix && (
                        <div className="bg-white dark:bg-stone-800/40 p-6 rounded-3xl border border-gray-200 dark:border-stone-700/50 shadow-sm space-y-3">
                            <h3 className="font-bold flex items-center gap-2 text-gray-800 dark:text-stone-100">
                                <SparklesIcon className="w-5 h-5 text-violet-500" /> AI Assistant
                            </h3>
                            <p className="text-[10px] text-gray-400 dark:text-stone-500">
                                Use AI to improve your page content, fix grammar, enhance readability, or generate better SEO metadata.
                            </p>
                            <div className="space-y-2">
                                <button
                                    type="button"
                                    onClick={() => { setFixInstruction(""); setFixResult(null); setFixModalOpen(true); }}
                                    className="w-full px-3 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/10 hover:from-emerald-600 hover:to-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <SparklesIcon className="w-3.5 h-3.5" /> Fix Content
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setFixInstruction("Improve the SEO of this page. Optimize the title for search engines (max 60 characters), write a compelling meta description (max 160 characters), suggest 5-8 relevant keyword tags, and improve the excerpt to be more engaging. Preserve the 'Sumber / Sources' references section and all its links at the end of the page. Output the complete improved page in HTML."); setFixResult(null); setFixModalOpen(true); }}
                                    className="w-full px-3 py-2 bg-gray-100 dark:bg-stone-700 text-gray-700 dark:text-stone-300 rounded-xl text-xs font-bold hover:bg-gray-200 dark:hover:bg-stone-600 transition-all flex items-center justify-center gap-2"
                                >
                                    <SparklesIcon className="w-3.5 h-3.5" /> Improve SEO
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Language Card */}
                    <div className="bg-white dark:bg-stone-800/40 p-6 rounded-3xl border border-gray-200 dark:border-stone-700/50 shadow-sm space-y-4">
                        <h3 className="font-bold flex items-center gap-2 text-gray-800 dark:text-stone-100">
                            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                            </svg>
                            {t("content.language")}
                        </h3>
                        <select
                            name="locale"
                            value={form.locale}
                            onChange={handleChange}
                            className="w-full mt-1.5 p-3 bg-gray-50 dark:bg-stone-900/80 border border-gray-100 dark:border-stone-700/50 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
                        >
                            {SUPPORTED_LOCALES.map(loc => (
                                <option key={loc} value={loc}>{getLocaleLabel(loc as "en_US" | "id_ID")}</option>
                            ))}
                        </select>
                    </div>

                    {/* COVER IMAGE */}
                    <FeaturedImagePicker
                        value={form.featuredImage.url}
                        alt={form.featuredImage.alt}
                        title={form.title}
                        onChange={(data) => setForm(prev => ({ ...prev, featuredImage: data }))}
                    />

                    {/* TAGS */}
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
                                    className="flex-1 text-xs p-3 bg-gray-50 dark:bg-stone-900/80 border border-gray-100 dark:border-stone-700/50 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
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

                    {/* SEO */}
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-50 dark:from-emerald-950/30 dark:to-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 rounded-2xl p-5 space-y-4">
                        <h3 className="font-bold flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                            <GlobeAltIcon className="w-5 h-5" /> SEO Settings
                        </h3>
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-emerald-600/70 dark:text-emerald-400/70">{t("content.metaTitle")}</label>
                                <input
                                    name="meta.title"
                                    value={form.meta.title}
                                    onChange={handleChange}
                                    className="w-full bg-white/70 dark:bg-stone-800/40 border border-emerald-200/50 dark:border-emerald-900/30 rounded-xl p-3 text-sm outline-none placeholder:text-emerald-400/40 focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-emerald-600/70 dark:text-emerald-400/70">{t("content.metaDescription")}</label>
                                <textarea
                                    name="excerpt"
                                    value={form.excerpt}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full bg-white/70 dark:bg-stone-800/40 border border-emerald-200/50 dark:border-emerald-900/30 rounded-xl p-3 text-sm outline-none resize-none focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Fix by AI Modal */}
            {fixModalOpen && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white dark:bg-stone-900/80 rounded-2xl shadow-2xl border border-gray-200 dark:border-stone-700/50 max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
                        <div className="flex items-center gap-3 border-b border-gray-100 dark:border-stone-700/50 px-6 py-4">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400 shrink-0">
                                <SparklesIcon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-black">AI Content Assistant</h3>
                                <p className="text-[10px] text-gray-400">Describe what you want AI to improve</p>
                            </div>
                            <button onClick={() => { setFixModalOpen(false); setFixResult(null); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-stone-800 rounded-lg transition-colors">
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {!fixResult && !fixLoading && (
                                <>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Your Instruction</label>
                                        <textarea
                                            value={fixInstruction}
                                            onChange={e => setFixInstruction(e.target.value)}
                                            onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); if (fixInstruction.trim()) handleFixByAI(fixInstruction); } }}
                                            placeholder="e.g. Fix grammar and spelling errors, improve paragraph flow, make the tone more professional..."
                                            rows={3}
                                            autoFocus
                                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-stone-700/50 bg-gray-50 dark:bg-stone-800/40 text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-all resize-none"
                                        />
                                        <p className="text-[9px] text-gray-400 mt-1">Tip: Ctrl+Enter to submit</p>
                                    </div>
                                    <div className="bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 rounded-xl p-3">
                                        <p className="text-[10px] text-violet-700 dark:text-violet-300 font-medium">
                                            AI will analyze your current content and suggest improvements. You&apos;ll see a preview before anything is applied.
                                        </p>
                                    </div>
                                </>
                            )}
                            {fixLoading && (
                                <div className="text-center py-10">
                                    <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                                        <div className="absolute inset-0 rounded-full border-4 border-violet-200 dark:border-violet-800" />
                                        <div className="absolute inset-0 rounded-full border-4 border-t-violet-600 animate-spin" />
                                        <SparklesIcon className="w-6 h-6 text-violet-600" />
                                    </div>
                                    <h4 className="text-sm font-black mb-1">AI is working...</h4>
                                    <p className="text-[10px] text-gray-400">Analyzing your content</p>
                                </div>
                            )}
                            {fixResult && (
                                <div className="space-y-4">
                                    {fixResult.suggested.changes_summary && (
                                        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3">
                                            <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 mb-1">Changes Summary</p>
                                            <p className="text-xs text-emerald-600 dark:text-emerald-400">{fixResult.suggested.changes_summary}</p>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Original</span>
                                            <div className="border border-gray-200 dark:border-stone-700/50 rounded-xl p-3 bg-gray-50 dark:bg-stone-800/40 space-y-2 max-h-60 overflow-y-auto">
                                                <p className="text-xs font-bold">{fixResult.original.title}</p>
                                                <p className="text-[10px] text-gray-500 line-clamp-4">{fixResult.original.content.replace(/<[^>]*>/g, "").substring(0, 500)}...</p>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-violet-600 dark:text-violet-400">AI Suggested</span>
                                            <div className="border border-violet-200 dark:border-violet-800 rounded-xl p-3 bg-violet-50 dark:bg-violet-950/20 space-y-2 max-h-60 overflow-y-auto">
                                                <p className="text-xs font-bold">{fixResult.suggested.title}</p>
                                                <p className="text-[10px] text-gray-600 dark:text-stone-400 line-clamp-4">{fixResult.suggested.content.replace(/<[^>]*>/g, "").substring(0, 500)}...</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="border-t border-gray-100 dark:border-stone-700/50 px-6 py-4 flex items-center justify-between">
                            {fixResult ? (
                                <>
                                    <button onClick={() => { setFixResult(null); }} className="px-4 py-2.5 text-xs font-bold bg-gray-100 dark:bg-stone-800 rounded-xl hover:bg-gray-200 dark:hover:bg-stone-700 transition-all">
                                        Discard & Edit
                                    </button>
                                    <button onClick={applyFixResult} className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/10 hover:from-emerald-600 hover:to-emerald-700 active:scale-95 transition-all flex items-center gap-1.5">
                                        <CheckIcon className="w-3.5 h-3.5" /> Apply Changes
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => { setFixModalOpen(false); setFixResult(null); }} className="px-4 py-2.5 text-xs font-bold bg-gray-100 dark:bg-stone-800 rounded-xl hover:bg-gray-200 dark:hover:bg-stone-700 transition-all">
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleFixByAI(fixInstruction)}
                                        disabled={!fixInstruction.trim() || fixLoading}
                                        className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/10 hover:from-emerald-600 hover:to-emerald-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                                    >
                                        <SparklesIcon className="w-3.5 h-3.5" /> Run AI
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}