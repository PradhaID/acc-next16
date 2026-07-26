'use client';

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { GlobeAltIcon } from "@heroicons/react/24/outline";
import PageHeader from "@/components/ui/PageHeader";
import FormField from "@/components/ui/FormField";
import Toggle from "@/components/ui/Toggle";
import { useT } from "@/components/LanguageProvider";
import { SUPPORTED_LOCALES } from "@/lib/i18n/types";
import { getLocaleLabel } from "@/lib/i18n";

interface Category {
    _id: string;
    name: string;
    parent?: { _id: string; name: string } | null;
    description?: string;
    isActive: boolean;
}

export default function ContentCategoryEdit() {
    const t = useT();
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [categories, setCategories] = useState<Category[]>([]);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "";

    const slugify = (text: string) =>
        text
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-");

    const [form, setForm] = useState({
        name: "",
        slug: "",
        parent: "",
        description: "",
        locale: "id_ID",
        isActive: true,
        metaTitle: "",
        metaDescription: "",
        categoryImage: "",
    });

    useEffect(() => {
        async function fetchData() {
            try {
                const [catRes, listRes] = await Promise.all([
                    fetch(`/api/content/category?id=${id}`),
                    fetch(`/api/content/category?active=true&all=true`)
                ]);

                const catJson = await catRes.json();
                const listJson = await listRes.json();

                if (!catRes.ok) throw new Error("Failed to load category");

                setForm({
                    name: catJson.data.name || "",
                    slug: catJson.data.slug || "",
                    parent: catJson.data.parent?._id || "",
                    description: catJson.data.description || "",
                    locale: catJson.data.locale || "id_ID",
                    isActive: catJson.data.isActive,
                    metaTitle: catJson.data.meta?.title || "",
                    metaDescription: catJson.data.meta?.description || "",
                    categoryImage: catJson.data.structuredData?.image || "",
                });

                if (catJson.data.structuredData?.image) {
                    setPreviewImage(catJson.data.structuredData.image);
                }

                setCategories(
                    (listJson.data || []).filter((c: Category) => c._id !== id)
                );
            } catch (err: any) {
                setError(err.message || "Failed to load data");
            }
        }
        fetchData();
    }, [id]);

    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
        const { name, value } = e.target;
        setForm(prev => {
            const newState = { ...prev, [name]: value };
            if (name === "name") {
                newState.slug = slugify(value);
                if (!prev.metaTitle || prev.metaTitle === prev.name) {
                    newState.metaTitle = value;
                }
            }
            if (name === "description") {
                if (!prev.metaDescription || prev.metaDescription === prev.description) {
                    newState.metaDescription = value;
                }
            }
            return newState;
        });
    }

    function toggleStatus() {
        setForm(prev => ({ ...prev, isActive: !prev.isActive }));
    }

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        try {
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
                setForm(prev => ({ ...prev, categoryImage: data.url }));
                setPreviewImage(data.url);
            }
        } catch (err) {
            alert("Upload failed");
        } finally {
            setUploading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");
        const payload = {
            id,
            name: form.name,
            slug: form.slug,
            description: form.description,
            parent: form.parent || null,
            locale: form.locale,
            isActive: form.isActive,
            meta: {
                title: form.metaTitle || form.name,
                description: form.metaDescription || form.description,
            },
            structuredData: {
                type: "CollectionPage",
                image: form.categoryImage
            }
        };
        const res = await fetch("/api/content/category", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const data = await res.json();
            setError(data.message || "Failed to update category");
            setLoading(false);
            return;
        }
        router.push("/content/category");
    }

    return (
        <div className="max-w-full mx-auto space-y-6 pb-10">
            <PageHeader
                title={t("content.editCategory")}
                subtitle={
                    <>
                        Editing: <span className="font-bold text-emerald-600">{form.name || "..."}</span>
                    </>
                }
                actions={
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center justify-between gap-3">
                            <Link
                                href="/content/category"
                                className="btn-action-secondary"
                            >
                                 {t("common.cancel")}
                             </Link>
                            <div className="sm:hidden flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Status:</span>
                                <Toggle
                                    id="category-status-toggle-mobile"
                                    checked={form.isActive}
                                    onChange={toggleStatus}
                                    label={form.isActive ? "Active" : "Inactive"}
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            form="category-edit-form"
                            disabled={loading}
                            className="btn-action-primary"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                            {loading ? t("common.loading") : t("content.updateCategory")}
                        </button>
                    </div>
                }
            />

            <form id="category-edit-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left column — form */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-white dark:bg-stone-900/80 p-6 rounded-2xl border border-gray-200 dark:border-stone-700/50 shadow-sm">
                        {error && (
                            <div className="mb-6 p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold">
                                {error}
                            </div>
                        )}

                        <div className="space-y-6">
                            <FormField label={t("content.name")} required>
                                <input
                                    type="text"
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-white dark:bg-stone-800/40 border border-gray-300 dark:border-stone-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-colors"
                                    placeholder="Category name..."
                                    required
                                />
                            </FormField>

                            <FormField label={t("content.slug")}>
                                <div className="flex items-center gap-2 text-xs text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 rounded-xl">
                                    <GlobeAltIcon className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate">{APP_URL}/category/{form.slug || "..."}</span>
                                </div>
                            </FormField>

                            <FormField label={t("content.descriptionLabel")}>
                                <textarea
                                    name="description"
                                    rows={6}
                                    value={form.description}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-white dark:bg-stone-800/40 border border-gray-300 dark:border-stone-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 resize-none transition-colors"
                                    placeholder="Describe what this category is about..."
                                />
                            </FormField>

                            <FormField label={t("content.parentCategory")}>
                                <select
                                    name="parent"
                                    value={form.parent}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-white dark:bg-stone-800/40 border border-gray-300 dark:border-stone-600 rounded-lg text-sm text-gray-900 dark:text-white appearance-none cursor-pointer outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-colors"
                                >
                                    <option value="">— {t("content.noneTopLevel")} —</option>
                                    {categories.map(c => (
                                        <option key={c._id} value={c._id}>{c.name}</option>
                                    ))}
                                </select>
                            </FormField>

                            <FormField label={t("content.language")}>
                                <select
                                    name="locale"
                                    value={form.locale}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-white dark:bg-stone-800/40 border border-gray-300 dark:border-stone-600 rounded-lg text-sm text-gray-900 dark:text-white appearance-none cursor-pointer outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-colors"
                                >
                                    {SUPPORTED_LOCALES.map(loc => (
                                        <option key={loc} value={loc}>{getLocaleLabel(loc as "en_US" | "id_ID")}</option>
                                    ))}
                                </select>
                            </FormField>
                        </div>
                    </div>

                    {/* Status toggle — desktop only */}
                    <div className="hidden sm:flex bg-white dark:bg-stone-900/80 p-6 rounded-2xl border border-gray-200 dark:border-stone-700/50 shadow-sm items-center justify-between">
                        <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{t("content.visibility")}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                                If disabled, this category won&apos;t show in public listings.
                            </p>
                        </div>
                        <Toggle
                            id="category-status-toggle"
                            checked={form.isActive}
                            onChange={toggleStatus}
                            label={form.isActive ? "Active" : "Inactive"}
                        />
                    </div>
                </div>

                {/* Right column — info cards */}
                <div className="space-y-4">
                    {/* Thumbnail */}
                    <div className="bg-white dark:bg-stone-900/80 p-4 rounded-2xl border border-gray-200 dark:border-stone-700/50 shadow-sm">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-3">
                            Thumbnail
                        </h3>
                        <div className="w-full h-40 border-2 border-dashed rounded-xl flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-stone-800/40 border-gray-200 dark:border-stone-700/50">
                            {previewImage ? (
                                <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-center p-4">
                                    <span className="text-xs text-gray-400">No Image Selected</span>
                                </div>
                            )}
                        </div>
                        <input
                            type="file"
                            onChange={handleImageUpload}
                            className="mt-3 block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                        />
                        {uploading && <p className="text-[10px] text-emerald-500 animate-pulse mt-2 text-center">Uploading image...</p>}
                    </div>

                    {/* Category Details */}
                    <div className="bg-white dark:bg-stone-900/80 p-4 rounded-2xl border border-gray-200 dark:border-stone-700/50 shadow-sm">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-3">
                            Category Details
                        </h3>
                        <dl className="space-y-2 text-xs">
                            <div className="flex justify-between">
                                <dt className="text-gray-400">Name</dt>
                                <dd className="font-bold text-gray-700 dark:text-stone-300 truncate max-w-[140px]">{form.name || "—"}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-gray-400">Slug</dt>
                                <dd className="font-bold text-gray-700 dark:text-stone-300 font-mono truncate max-w-[140px]">{form.slug || "—"}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-gray-400">Parent</dt>
                                <dd className="font-bold text-gray-700 dark:text-stone-300 truncate max-w-[140px]">
                                    {categories.find(c => c._id === form.parent)?.name || "None"}
                                </dd>
                            </div>
                        </dl>
                    </div>

                    {/* SEO */}
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-50 dark:from-emerald-950/30 dark:to-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 rounded-2xl p-4 space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                            SEO Settings
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-emerald-600/70 dark:text-emerald-400/70">Meta Title</label>
                                <input
                                    name="metaTitle"
                                    value={form.metaTitle}
                                    onChange={handleChange}
                                    className="w-full bg-white dark:bg-stone-800/40 border border-gray-300 dark:border-stone-600 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                                />
                                <div className="flex justify-between mt-1 px-1">
                                    <span className="text-[10px] text-emerald-600/50">Limit: 60</span>
                                    <span className={`text-[10px] ${form.metaTitle.length > 60 ? 'text-red-500' : 'text-emerald-600/50'}`}>
                                        {form.metaTitle.length} chars
                                    </span>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-emerald-600/70 dark:text-emerald-400/70">Meta Description</label>
                                <textarea
                                    name="metaDescription"
                                    rows={3}
                                    value={form.metaDescription}
                                    onChange={handleChange}
                                    className="w-full bg-white dark:bg-stone-800/40 border border-gray-300 dark:border-stone-600 rounded-lg px-3 py-2 text-sm mt-1 outline-none resize-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                                />
                                <div className="flex justify-between mt-1 px-1">
                                    <span className="text-[10px] text-emerald-600/50">Limit: 160</span>
                                    <span className={`text-[10px] ${form.metaDescription.length > 160 ? 'text-red-500' : 'text-emerald-600/50'}`}>
                                        {form.metaDescription.length} chars
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}