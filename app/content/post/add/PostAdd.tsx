'use client';

import { useEffect, useState, useCallback } from "react";
import ContentEditor from "@/components/editor/ContentEditor";
import slugify from "slugify";
import Link from "next/link";
import { ArrowLeftIcon, CheckIcon, XMarkIcon, PhotoIcon, GlobeAltIcon, TagIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
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

/* ======================================================
   INTERFACES
====================================================== */
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

export default function PostAdd() {
    const t = useT();
    const router = useRouter();
    const settings = useSettings();
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
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [tagInput, setTagInput] = useState("");
    const [previewUrl, setPreviewUrl] = useState<string>("");
    const [postId, setPostId] = useState<string | undefined>(undefined);
    const [showRestorePrompt, setShowRestorePrompt] = useState(false);

    const handleApiSave = useCallback(async (formData: typeof form) => {
        const submitData = {
            ...formData,
            published: {
                ...formData.published,
                at: formData.published.at ? new Date(formData.published.at).toISOString() : ""
            }
        };

        if (postId) {
            // Update existing draft
            const res = await fetch(`/api/content/post?id=${postId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: postId, ...submitData }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => null);
                throw new Error(err?.message || "Auto-save failed");
            }
        } else {
            // Create new draft
            const res = await fetch("/api/content/post", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...submitData, status: "draft" }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => null);
                throw new Error(err?.message || "Auto-save failed");
            }
            const data = await res.json();
            if (data.data?._id) {
                setPostId(data.data._id);
            }
        }
    }, [postId]);

    const { status: saveStatus, lastSaved, hasDraft, restoreDraft, dismissDraft, forceSave, errorMessage } = useAutoSave({
        form,
        type: "post",
        id: postId,
        onApiSave: handleApiSave,
    });

    // Check for draft on mount
    useEffect(() => {
        const draft = loadDraft("post", undefined);
        if (draft && draft.form && (draft.form.title || draft.form.content)) {
            setShowRestorePrompt(true);
        }
    }, []);

    const handleRestoreDraft = () => {
        const draft = loadDraft("post", undefined);
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
        clearDraft("post", undefined);
        setShowRestorePrompt(false);
    };

    /* ======================================================
       FETCH CATEGORIES & GROUPING
    ====================================================== */
    useEffect(() => {
        fetch("/api/content/category")
            .then(res => res.json())
            .then(data => {
                const cats: Category[] = data.data || [];
                setCategories(cats);

                const grouped: GroupedCategories = {};
                const parentCats = cats.filter(c => !c.parent);

                parentCats.forEach((parent: Category) => {
                    grouped[parent._id] = cats.filter((c: Category) => {
                        const parentId = typeof c.parent === 'object' ? c.parent?._id : c.parent;
                        return c.parent && parentId === parent._id;
                    });
                });

                grouped['root'] = parentCats;
                setGroupedCategories(grouped);
            });
    }, []);

    /* ======================================================
       HANDLERS
    ====================================================== */
    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
        const { name, value } = e.target;

        setForm(prev => {
            const newState = { ...prev };

            if (name === "title") {
                newState.title = value;
                newState.slug = slugify(value, { lower: true, strict: true });
                if (!prev.meta.title || prev.meta.title === prev.title) {
                    newState.meta = { ...prev.meta, title: value };
                }
                if (!prev.featuredImage.alt || prev.featuredImage.alt === prev.title) {
                    newState.featuredImage = { ...prev.featuredImage, alt: value };
                }
                if (!prev.meta.title || prev.meta.title === prev.title) {
                    newState.meta = { ...prev.meta, title: value };
                }
            } else if (name === "excerpt") {
                newState.excerpt = value;
                if (!prev.meta.description || prev.meta.description === prev.excerpt) {
                    newState.meta = { ...prev.meta, description: value };
                }
            } else if (name.startsWith('meta.')) {
                const field = name.split('.')[1];
                newState.meta = { ...prev.meta, [field]: value };
            } else if (name === 'featuredImageAlt') {
                newState.featuredImage = { ...prev.featuredImage, alt: value };
            } else if (name === 'publishedAt') {
                newState.published = { ...prev.published, at: value };
            } else {
                (newState as any)[name] = value;
            }

            return newState;
        });
    }

    function toggleCategory(id: string) {
        setForm(prev => ({
            ...prev,
            categories: prev.categories.includes(id)
                ? prev.categories.filter(c => c !== id)
                : [...prev.categories, id],
        }));
    }

    const handleTagInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value.includes(',')) {
            const tags = value.split(',').map(t => t.trim()).filter(t => t);
            tags.forEach(tag => {
                if (tag && !form.tags.includes(tag)) {
                    setForm(prev => ({ ...prev, tags: [...prev.tags, tag] }));
                }
            });
            setTagInput("");
        } else {
            setTagInput(value);
        }
    };

    const addTag = () => {
        if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
            setForm(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
            setTagInput("");
        }
    };

    const removeTag = (tag: string) => {
        setForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
                    featuredImage: {
                        url: result.url,
                        alt: prev.featuredImage.alt || prev.title
                    }
                }));
            }
        } catch (error) {
            console.error('Upload error', error);
        }
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        const submitData = {
            ...form,
            published: {
                ...form.published,
                at: form.published.at ? new Date(form.published.at).toISOString() : ""
            }
        };
        const res = await fetch(
            postId ? `/api/content/post?id=${postId}` : "/api/content/post",
            {
                method: postId ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(postId ? { id: postId, ...submitData } : submitData),
            }
        );
        setLoading(false);
        if (res.ok) {
            clearDraft("post", postId);
            router.push("/content/post");
        }
    }

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

            {/* Header Sticky */}
            <div className="sticky top-0 z-10 bg-gray-50/80 dark:bg-stone-900/80 backdrop-blur-md py-4 border-b border-stone-200 dark:border-stone-700/50 -mx-6 md:-mx-8 lg:-mx-10 -mt-6 md:-mt-8 lg:-mt-10 px-6 md:px-8 lg:px-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/content/post" className="btn-action-back">
                            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold">{form.title || 'Create Post'}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${form.status === 'published' && form.published.at && new Date(form.published.at) > new Date() ? 'bg-emerald-100 text-emerald-700' : form.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-100 text-emerald-700'}`}>
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
                                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${form.status === s ? 'bg-white dark:bg-stone-700 text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                        >
                                            {t(`status.${s}`)}
                                        </button>
                                    ))}
                            </div>
                        </div>
                        <button onClick={handleSubmit} disabled={loading} className="btn-action-primary">
                            {loading ? "..." : <><CheckIcon className="w-4 h-4" /> Save</>}
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT COLUMN: Content */}
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
                            <div className="flex items-center gap-2 text-xs text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-full w-fit">
                                <GlobeAltIcon className="w-3.5 h-3.5" />
                                <span>{`${APP_URL}/read/${form.slug}`}</span>
                            </div>
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

                {/* RIGHT COLUMN: Sidebar */}
                <div className="space-y-6">
                    {/* Scheduling */}
                    <div className="dashboard-card p-5 bg-white dark:bg-stone-800/40 rounded-2xl shadow-sm space-y-4">
                        <h3 className="font-semibold flex items-center gap-2">
                            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                className="w-full mt-1.5 p-2 bg-gray-50 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-700/50 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                            <p className="text-[10px] text-gray-400 mt-2 italic">Leave empty to publish immediately when status is "Publish".</p>
                        </div>
                    </div>

                    {/* Language Card */}
                    <div className="dashboard-card p-5 bg-white dark:bg-stone-800/40 rounded-2xl shadow-sm space-y-4">
                        <h3 className="font-semibold flex items-center gap-2">
                            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                            </svg>
                            {t("content.language")}
                        </h3>
                        <select
                            name="locale"
                            value={form.locale}
                            onChange={handleChange}
                            className="w-full p-2 bg-gray-50 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-700/50 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-500"
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

                    {/* Taxonomy */}
                    <div className="dashboard-card p-5 bg-white dark:bg-stone-800/40 rounded-2xl shadow-sm space-y-6">
                            <h3 className="font-semibold mb-4 flex items-center gap-2"><Squares2X2Icon className="w-5 h-5" /> {t("content.categories")}</h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {groupedCategories.root?.map((parent: Category) => (
                                <div key={parent._id} className="space-y-1">
                                    <div
                                        onClick={() => toggleCategory(parent._id)}
                                        className={`flex items-center gap-2 px-2 rounded-lg cursor-pointer transition-all ${form.categories.includes(parent._id) ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-gray-50'}`}
                                    >
                                        <div className={`w-4 h-4 rounded border ${form.categories.includes(parent._id) ? 'bg-emerald-600 border-emerald-600' : 'border-stone-300'}`} />
                                        <span className="text-sm font-medium">{parent.name}</span>
                                    </div>
                                    {groupedCategories[parent._id]?.map((child: Category) => (
                                        <div
                                            key={child._id}
                                            onClick={() => toggleCategory(child._id)}
                                            className="flex items-center gap-2 px-2 ml-6 cursor-pointer text-xs"
                                        >
                                            <div className={`w-2 h-2 rounded-full ${form.categories.includes(child._id) ? 'bg-emerald-400' : 'bg-gray-200'}`} />
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
                                        className="flex-1 text-xs p-2 bg-gray-50 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-700/50 rounded-lg outline-none focus:border-emerald-500"
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
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-50 dark:from-emerald-950/30 dark:to-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 rounded-2xl p-5 space-y-4">
                        <h3 className="font-semibold mb-4 flex items-center gap-2 text-emerald-700 dark:text-emerald-300"><GlobeAltIcon className="w-5 h-5" /> SEO Strategy</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-emerald-600/70 dark:text-emerald-400/70">{t("content.metaTitle")}</label>
                                <input name="meta.title" value={form.meta.title} onChange={handleChange} className="w-full bg-white/70 dark:bg-stone-800/40 border border-emerald-200/50 dark:border-emerald-900/30 rounded-lg p-2 text-sm mt-1 outline-none focus:ring-1 focus:ring-emerald-500" />
                                <div className="flex justify-between mt-1 px-1">
                                    <span className="text-[10px] text-emerald-600/50">Limit: 60</span>
                                    <span className={`text-[10px] ${form.meta.title.length > 60 ? 'text-red-500' : 'text-emerald-600/50'}`}>
                                        {form.meta.title.length} chars
                                    </span>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-emerald-600/70 dark:text-emerald-400/70">{t("content.metaDescription")}</label>
                                <textarea name="excerpt" value={form.excerpt} onChange={handleChange} rows={3} className="w-full bg-white/70 dark:bg-stone-800/40 border border-emerald-200/50 dark:border-emerald-900/30 rounded-lg p-2 text-sm mt-1 outline-none resize-none focus:ring-1 focus:ring-emerald-500" />
                                <div className="flex justify-between mt-1 px-1">
                                    <span className="text-[10px] text-emerald-600/50">Limit: 160</span>
                                    <span className={`text-[10px] ${form.meta.description.length > 160 ? 'text-red-500' : 'text-emerald-600/50'}`}>
                                        {form.meta.description.length} chars
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}