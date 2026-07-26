'use client';

import { useCallback, useEffect, useState } from "react";
import ContentEditor from "@/components/editor/ContentEditor";
import slugify from "slugify";
import Link from "next/link";
import { ArrowLeftIcon, CheckIcon, XMarkIcon, PhotoIcon, GlobeAltIcon, TagIcon, Squares2X2Icon, SparklesIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import FeaturedImagePicker from "@/components/content/FeaturedImagePicker";
import { useAutoSave } from "@/lib/use-auto-save";
import AutoSaveIndicator from "@/components/ui/AutoSaveIndicator";
import { loadDraft, clearDraft } from "@/lib/draft-storage";
import { useT } from "@/components/LanguageProvider";
import { SUPPORTED_LOCALES } from "@/lib/i18n/types";
import { getLocaleLabel } from "@/lib/i18n";
import { wordCount } from "@/lib/text";
import { useSettings } from "@/lib/settings-context";
import { usePermission } from "@/hooks/useSession";
import { ROLES } from "@/lib/roles";

/* =========================
   INTERFACES
========================== */
interface Category {
    _id: string;
    name: string;
    parent?: string | { _id: string; name: string } | null;
}

interface GroupedCategories {
    [key: string]: Category[];
}

const formatDateForInput = (dateString: string | undefined) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export default function PostEdit({ id }: { id: string }) {
    const t = useT();
    const router = useRouter();
    const settings = useSettings();
    const aiConfigured = !!(settings.ai_url && settings.ai_api_key && settings.ai_model && settings.searxng_url);
    const canEdit = usePermission(ROLES.EDIT_POST);
    const canFix = usePermission(ROLES.FIX_POST);
    const APP_URL = settings.app_url || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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
        categories: [] as string[],
        tags: [] as string[],
        status: "draft",
        locale: "id_ID",
        featuredImage: { url: "", alt: "" },
        published: { at: "" },
        meta: { title: "", description: "", keywords: [] as string[] },
    });

    const [categories, setCategories] = useState<Category[]>([]);
    const [groupedCategories, setGroupedCategories] = useState<GroupedCategories>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tagInput, setTagInput] = useState("");
    const [previewUrl, setPreviewUrl] = useState<string>("");
    const [showRestorePrompt, setShowRestorePrompt] = useState(false);

    // Fix by AI state
    const [fixModalOpen, setFixModalOpen] = useState(false);
    const [fixInstruction, setFixInstruction] = useState("");
    const [fixLoading, setFixLoading] = useState(false);
    const [fixResult, setFixResult] = useState<{
        original: { title: string; content: string; excerpt: string; tags: string[]; categoryName: string };
        suggested: { title: string; content: string; excerpt: string; tags: string[]; categoryNames: string[]; changes_summary: string };
    } | null>(null);

    const handleApiSave = useCallback(async (formData: typeof form) => {
        const submitData = {
            ...formData,
            published: {
                ...formData.published,
                at: formData.published.at ? new Date(formData.published.at).toISOString() : ""
            }
        };
        const res = await fetch(`/api/content/post?id=${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...submitData }),
        });
        if (!res.ok) throw new Error("Auto-save failed");
    }, [id]);

    const { status: saveStatus, lastSaved, hasDraft, restoreDraft, dismissDraft, forceSave, errorMessage } = useAutoSave({
        form,
        type: "post",
        id,
        onApiSave: handleApiSave,
    });

    useEffect(() => {
        const draft = loadDraft("post", id);
        if (draft && draft.form && (draft.form.title || draft.form.content)) {
            setShowRestorePrompt(true);
        }
    }, [id]);

    const handleRestoreDraft = () => {
        const draft = loadDraft("post", id);
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
        clearDraft("post", id);
        setShowRestorePrompt(false);
    };

    /* =========================
       FETCH DATA
    ========================== */
    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const [postRes, catRes] = await Promise.all([
                    fetch(`/api/content/post?id=${id}`),
                    fetch("/api/content/category")
                ]);

                const postJson = await postRes.json();
                const catJson = await catRes.json();

                if (postJson.success && postJson.data) {
                    const post = postJson.data;
                    setForm({
                        title: post.title || "",
                        slug: post.slug || "",
                        excerpt: post.excerpt || "",
                        content: post.content || "",
                        categories: post.categories?.map((c: any) => c._id) || [],
                        tags: post.tags || [],
                        status: post.status || "draft",
                        locale: post.locale || "id_ID",
                        featuredImage: {
                            url: post.featuredImage?.url || "",
                            alt: post.featuredImage?.alt || "",
                        },
                        published: {
                            at: formatDateForInput(post.published?.at) || "",
                        },
                        meta: {
                            title: post.meta?.title || "",
                            description: post.meta?.description || "",
                            keywords: post.meta?.keywords || [],
                        },
                    });
                    if (post.featuredImage?.url) setPreviewUrl(post.featuredImage.url);
                }

                // Grouping Categories
                const cats: Category[] = catJson.data || [];
                const grouped: GroupedCategories = {};
                const parentCats = cats.filter(c => !c.parent);
                parentCats.forEach((parent: Category) => {
                    grouped[parent._id] = cats.filter((c: Category) => {
                        const pId = typeof c.parent === 'object' ? c.parent?._id : c.parent;
                        return pId === parent._id;
                    });
                });
                grouped['root'] = parentCats;
                setGroupedCategories(grouped);

            } catch (err) {
                console.error(err);
            }
            setLoading(false);
        }
        fetchData();
    }, [id]);

    /* =========================
       HANDLERS
    ========================== */
    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
        const { name, value } = e.target;

        setForm(prev => {
            const newState = { ...prev };

            if (name === "title") {
                newState.title = value;
                newState.slug = slugify(value, { lower: true, strict: true });
                // Auto-sync SEO Title & Image Alt if they haven't been manually changed
                if (!prev.meta.title || prev.meta.title === prev.title) newState.meta.title = value;
                if (!prev.featuredImage.alt || prev.featuredImage.alt === prev.title) newState.featuredImage.alt = value;
            }
            else if (name === "excerpt") {
                newState.excerpt = value;
                if (!prev.meta.description || prev.meta.description === prev.excerpt) newState.meta.description = value;
            }
            else if (name.startsWith('meta.')) {
                const field = name.split('.')[1];
                newState.meta = { ...prev.meta, [field]: value };
            }
            else if (name === 'featuredImageAlt') {
                newState.featuredImage.alt = value;
            }
            else if (name === 'publishedAt') {
                newState.published.at = value;
            }
            else {
                (newState as any)[name] = value;
            }

            return newState;
        });
    }

    const handleTagInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;

        // Jika user mengetik koma
        if (value.includes(',')) {
            const newTags = value.split(',')
                .map(t => t.trim())
                .filter(t => t !== "" && !form.tags.includes(t));

            if (newTags.length > 0) {
                setForm(prev => ({
                    ...prev,
                    tags: [...prev.tags, ...newTags]
                }));
            }
            setTagInput(""); // Reset input setelah koma diketik
        } else {
            setTagInput(value);
        }
    };

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => setPreviewUrl(reader.result as string);
        reader.readAsDataURL(file);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/upload', { method: 'POST', body: formData });
            const result = await response.json();
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
                setForm(prev => ({
                    ...prev,
                    featuredImage: { ...prev.featuredImage, url: result.url, alt: prev.featuredImage.alt || prev.title }
                }));
            }
        } catch (err) { alert("Upload failed"); }
    }

    function toggleCategory(catId: string) {
        setForm(prev => ({
            ...prev,
            categories: prev.categories.includes(catId)
                ? prev.categories.filter(c => c !== catId)
                : [...prev.categories, catId],
        }));
    }

    const addTag = () => {
        const cleanTag = tagInput.trim();
        if (cleanTag && !form.tags.includes(cleanTag)) {
            setForm(prev => ({
                ...prev,
                tags: [...prev.tags, cleanTag]
            }));
            setTagInput("");
        }
    };

    const removeTag = (tag: string) => {
        setForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
    };

    async function handleFixByAI(instruction: string) {
        setFixLoading(true);
        setFixResult(null);
        try {
            const res = await fetch("/api/content/post/fix-by-ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ postId: id, instruction }),
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

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        const submitData = {
            ...form,
            id,
            published: {
                ...form.published,
                at: form.published.at ? new Date(form.published.at).toISOString() : ""
            }
        };
        const res = await fetch("/api/content/post", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(submitData),
        });
        setSaving(false);
        if (res.ok) { clearDraft("post", id); router.push(`/content/post/detail/${id}`); }
    }

    if (loading) return <div className="p-10 text-center">Loading post...</div>;

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
            <div className="sticky top-0 z-10 bg-gray-50/80 dark:bg-stone-900/80 backdrop-blur-md py-4 border-b border-stone-200 dark:border-stone-700/50 -mx-6 md:-mx-8 lg:-mx-10 -mt-6 md:-mt-8 lg:-mt-10 px-6 md:px-8 lg:px-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/content/post" className="btn-action-back">
                            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold">{form.title || 'Edit Post'}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${form.status === 'published' && form.published.at && new Date(form.published.at) > new Date() ? 'bg-orange-100 text-orange-700' : form.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {form.status === 'published' && form.published.at && new Date(form.published.at) > new Date() ? 'Scheduled' : form.status}
                                </span>
                                <AutoSaveIndicator status={saveStatus} lastSaved={lastSaved} errorMessage={errorMessage} />
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center justify-between gap-3">
                            <Link href="/content/post" className="btn-action-secondary">
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
                                            {t(`status.${s}`)}
                                        </button>
                                    ))}
                            </div>
                        </div>
                        <button onClick={handleSubmit} disabled={saving || !canEdit} className="btn-action-primary">
                            {saving ? "..." : <><CheckIcon className="w-4 h-4" /> Save</>}
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT: Editor */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-stone-800/40 rounded-2xl border border-stone-200 dark:border-stone-700/50 overflow-hidden">
                        <div className="px-6 pt-6 pb-4">
                            <input
                                name="title"
                                value={form.title}
                                onChange={handleChange}
                                placeholder="Post Title..."
                                className="w-full text-3xl font-bold bg-transparent border-none focus:ring-0 focus:outline-none placeholder:text-gray-300 dark:placeholder:text-stone-500"
                            />
                        </div>
                        <div className="px-6 pb-4">
                            <div className="flex items-center gap-2 text-xs text-orange-500 bg-orange-50 px-3 py-1.5 rounded-full w-fit">
                                <GlobeAltIcon className="w-3.5 h-3.5" />
                                <span>{`${APP_URL}/read/${form.slug}`}</span>
                            </div>
                        </div>
                        <div className="px-6 mt-4 pb-6">
                            <ContentEditor value={form.content} onChange={(html) => setForm(prev => ({ ...prev, content: html }))} />
                        </div>
                        <div className="px-6 py-3 border-t border-stone-200 dark:border-stone-700/50 text-[10px] font-semibold text-gray-400 dark:text-stone-500 flex items-center justify-between">
                            <span>{wordCount(form.content)} words</span>
                            <span>{form.content.length} characters</span>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Sidebar */}
                <div className="space-y-6">
                    {/* Scheduling */}
                    <div className="dashboard-card p-5 bg-white dark:bg-stone-800/40 rounded-2xl shadow-sm space-y-4">
                        <h3 className="font-semibold flex items-center gap-2">
                            <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Scheduling
                        </h3>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Publish Date</label>
                            <input
                                type="datetime-local"
                                name="publishedAt"
                                value={form.published.at}
                                onChange={handleChange}
                                className="w-full mt-1.5 p-2 bg-gray-50 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-700/50 rounded-xl text-xs outline-none focus:ring-1 focus:ring-orange-500"
                            />
                            <p className="text-[10px] text-gray-400 mt-2 italic">Leave empty to publish immediately when status is "Publish".</p>
                        </div>
                    </div>

                    {/* AI Fix */}
                    {aiConfigured && canFix && (
                        <div className="bg-white dark:bg-stone-800/40 p-5 rounded-2xl border border-stone-200 dark:border-stone-700/50 shadow-sm space-y-3">
                            <h3 className="font-semibold flex items-center gap-2">
                                <SparklesIcon className="w-5 h-5 text-violet-500" /> AI Assistant
                            </h3>
                            <p className="text-[10px] text-gray-400 dark:text-stone-500">
                                Use AI to improve your post content, fix grammar, enhance readability, or generate better SEO metadata.
                            </p>
                            <div className="space-y-2">
                                <button
                                    type="button"
                                    onClick={() => { setFixInstruction(""); setFixResult(null); setFixModalOpen(true); }}
                                    className="w-full px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/10 hover:from-amber-600 hover:to-orange-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <SparklesIcon className="w-3.5 h-3.5" /> Fix Content
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setFixInstruction("Improve the SEO of this article. Optimize the title for search engines (max 60 characters), write a compelling meta description (max 160 characters), suggest 5-8 relevant keyword tags, and improve the excerpt to be more engaging. Preserve the 'Sumber / Sources' references section and all its links at the end of the article. Output the complete improved article in HTML."); setFixResult(null); setFixModalOpen(true); }}
                                    className="w-full px-3 py-2 bg-gray-100 dark:bg-stone-700 text-gray-700 dark:text-stone-300 rounded-xl text-xs font-bold hover:bg-gray-200 dark:hover:bg-stone-600 transition-all flex items-center justify-center gap-2"
                                >
                                    <SparklesIcon className="w-3.5 h-3.5" /> Improve SEO
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Language Card */}
                    <div className="dashboard-card p-5 bg-white dark:bg-stone-800/40 rounded-2xl shadow-sm space-y-4">
                        <h3 className="font-semibold flex items-center gap-2">
                            <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                            </svg>
                            {t("content.language")}
                        </h3>
                        <select
                            name="locale"
                            value={form.locale}
                            onChange={handleChange}
                            className="w-full p-2 bg-gray-50 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-700/50 rounded-xl text-xs outline-none focus:ring-1 focus:ring-orange-500"
                        >
                            {SUPPORTED_LOCALES.map(loc => (
                                <option key={loc} value={loc}>{getLocaleLabel(loc as "en_US" | "id_ID")}</option>
                            ))}
                        </select>
                    </div>

                    {/* Featured Image */}
                    <FeaturedImagePicker
                        value={form.featuredImage.url}
                        alt={form.featuredImage.alt}
                        title={form.title}
                        onChange={(data) => setForm(prev => ({ ...prev, featuredImage: data }))}
                    />

                    {/* Taxonomy */}
                    <div className="dashboard-card p-5 bg-white dark:bg-stone-800/40 rounded-2xl shadow-sm space-y-6">
                        <h3 className="font-semibold mb-4 flex items-center gap-2"><Squares2X2Icon className="w-5 h-5" /> {t("content.categories")}</h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {groupedCategories.root?.map((parent: Category) => (
                                <div key={parent._id} className="space-y-1">
                                    <div
                                        onClick={() => toggleCategory(parent._id)}
                                        className={`flex items-center gap-2 px-2 rounded-lg cursor-pointer transition-all ${form.categories.includes(parent._id) ? 'bg-orange-50 text-orange-700' : 'hover:bg-gray-50'}`}
                                    >
                                        <div className={`w-4 h-4 rounded border ${form.categories.includes(parent._id) ? 'bg-orange-600 border-orange-600' : 'border-stone-300'}`} />
                                        <span className="text-sm font-medium">{parent.name}</span>
                                    </div>
                                    {groupedCategories[parent._id]?.map((child: Category) => (
                                        <div
                                            key={child._id}
                                            onClick={() => toggleCategory(child._id)}
                                            className="flex items-center gap-2 px-2 ml-6 cursor-pointer text-xs"
                                        >
                                            <div className={`w-2 h-2 rounded-full ${form.categories.includes(child._id) ? 'bg-orange-400' : 'bg-gray-200'}`} />
                                            <span>{child.name}</span>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                        <div className="pt-4 border-t space-y-3">
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                <TagIcon className="w-5 h-5 text-emerald-500" /> Tags
                            </h3>

                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={tagInput}
                                        onChange={handleTagInput}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                        placeholder="Add tag (press Enter)..."
                                        className="flex-1 text-xs p-2 bg-gray-50 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-700/50 rounded-lg outline-none focus:border-orange-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={addTag}
                                        className="px-3 py-1 bg-gray-100 dark:bg-stone-700 rounded-lg text-xs font-medium hover:bg-gray-200"
                                    >
                                        Add
                                    </button>
                                </div>

                                {/* List of Added Tags */}
                                <div className="flex flex-wrap gap-2 min-h-[20px]">
                                    {form.tags.length > 0 ? (
                                        form.tags.map((tag, idx) => (
                                            <span
                                                key={idx}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-md border border-emerald-100 dark:border-emerald-800"
                                            >
                                                #{tag}
                                                <button
                                                    type="button"
                                                    onClick={() => removeTag(tag)}
                                                    className="hover:text-red-500 transition-colors"
                                                >
                                                    <XMarkIcon className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))
                                    ) : (
                                        <p className="text-[10px] text-gray-400 italic">No tags added yet. Used as keywords.</p>
                                    )}
                                </div>
                                <p className="text-[10px] text-gray-400">Tip: Press comma (,) or Enter to add tags.</p>
                            </div>
                        </div>
                    </div>

                    {/* SEO */}
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-2xl p-5 space-y-4">
                        <h3 className="font-semibold mb-4 flex items-center gap-2 text-amber-700 dark:text-amber-300"><GlobeAltIcon className="w-5 h-5" /> SEO Strategy</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-amber-600/70 dark:text-amber-400/70">{t("content.metaTitle")}</label>
                                <input name="meta.title" value={form.meta.title} onChange={handleChange} className="w-full bg-white/70 dark:bg-stone-800/40 border border-amber-200/50 dark:border-amber-900/30 rounded-lg p-2 text-sm mt-1 outline-none focus:ring-1 focus:ring-amber-500" />
                                <div className="flex justify-between mt-1 px-1">
                                    <span className="text-[10px] text-amber-600/50">Limit: 60</span>
                                    <span className={`text-[10px] ${form.meta.title.length > 60 ? 'text-red-500' : 'text-amber-600/50'}`}>
                                        {form.meta.title.length} chars
                                    </span>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-amber-600/70 dark:text-amber-400/70">{t("content.metaDescription")}</label>
                                <textarea name="excerpt" value={form.excerpt} onChange={handleChange} rows={3} className="w-full bg-white/70 dark:bg-stone-800/40 border border-amber-200/50 dark:border-amber-900/30 rounded-lg p-2 text-sm mt-1 outline-none resize-none focus:ring-1 focus:ring-amber-500" />
                                <div className="flex justify-between mt-1 px-1">
                                    <span className="text-[10px] text-amber-600/50">Limit: 160</span>
                                    <span className={`text-[10px] ${form.meta.description.length > 160 ? 'text-red-500' : 'text-amber-600/50'}`}>
                                        {form.meta.description.length} chars
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Fix by AI Modal */}
            {fixModalOpen && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white dark:bg-stone-900/80 rounded-2xl shadow-2xl border border-gray-200 dark:border-stone-700/50 max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">

                        {/* Header */}
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

                        {/* Body */}
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
                                            💡 AI will research your topic via SearXNG, analyze your current content, and suggest improvements.
                                            You&apos;ll see a preview before anything is applied.
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
                                    <p className="text-[10px] text-gray-400">Researching and analyzing your content</p>
                                </div>
                            )}

                            {fixResult && (
                                <div className="space-y-4">
                                    {/* Changes Summary */}
                                    {fixResult.suggested.changes_summary && (
                                        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3">
                                            <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 mb-1">Changes Summary</p>
                                            <p className="text-xs text-emerald-600 dark:text-emerald-400">{fixResult.suggested.changes_summary}</p>
                                        </div>
                                    )}

                                    {/* Side-by-side comparison */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Original */}
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Original</span>
                                            </div>
                                            <div className="border border-gray-200 dark:border-stone-700/50 rounded-xl p-3 bg-gray-50 dark:bg-stone-800/40 space-y-2 max-h-60 overflow-y-auto">
                                                <p className="text-xs font-bold">{fixResult.original.title}</p>
                                                <p className="text-[10px] text-gray-500 line-clamp-4">{fixResult.original.content.replace(/<[^>]*>/g, "").substring(0, 500)}...</p>
                                                {fixResult.original.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {fixResult.original.tags.map((t, i) => (
                                                            <span key={i} className="px-1.5 py-0.5 bg-gray-200 dark:bg-stone-700 rounded text-[9px]">{t}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Suggested */}
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-violet-600 dark:text-violet-400">AI Suggested</span>
                                            </div>
                                            <div className="border border-violet-200 dark:border-violet-800 rounded-xl p-3 bg-violet-50 dark:bg-violet-950/20 space-y-2 max-h-60 overflow-y-auto">
                                                <p className="text-xs font-bold">{fixResult.suggested.title}</p>
                                                <p className="text-[10px] text-gray-600 dark:text-stone-400 line-clamp-4">{fixResult.suggested.content.replace(/<[^>]*>/g, "").substring(0, 500)}...</p>
                                                {fixResult.suggested.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {fixResult.suggested.tags.map((t, i) => (
                                                            <span key={i} className="px-1.5 py-0.5 bg-violet-200 dark:bg-violet-800 rounded text-[9px]">{t}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="border-t border-gray-100 dark:border-stone-700/50 px-6 py-4 flex items-center justify-between">
                            {fixResult ? (
                                <>
                                    <button
                                        onClick={() => { setFixResult(null); }}
                                        className="px-4 py-2.5 text-xs font-bold bg-gray-100 dark:bg-stone-800 rounded-xl hover:bg-gray-200 dark:hover:bg-stone-700 transition-all"
                                    >
                                        Discard & Edit
                                    </button>
                                    <button
                                        onClick={applyFixResult}
                                        className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/10 hover:from-amber-600 hover:to-orange-700 active:scale-95 transition-all flex items-center gap-1.5"
                                    >
                                        <CheckIcon className="w-3.5 h-3.5" /> Apply Changes
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => { setFixModalOpen(false); setFixResult(null); }}
                                        className="px-4 py-2.5 text-xs font-bold bg-gray-100 dark:bg-stone-800 rounded-xl hover:bg-gray-200 dark:hover:bg-stone-700 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleFixByAI(fixInstruction)}
                                        disabled={!fixInstruction.trim() || fixLoading}
                                        className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/10 hover:from-amber-600 hover:to-orange-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
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