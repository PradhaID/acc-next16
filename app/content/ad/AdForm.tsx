'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    PhotoIcon,
    TrashIcon,
    PlusIcon,
    ArrowPathIcon,
    InformationCircleIcon,
    ArrowLeftIcon,
    CheckIcon,
    CalendarIcon,
    Squares2X2Icon
} from "@heroicons/react/24/outline";
import Toggle from "@/components/ui/Toggle";
import { useT } from "@/components/LanguageProvider";

interface AdItem {
    imageUrl: string;
    linkUrl?: string;
    altText?: string;
}

interface AdFormProps {
    initialData?: any;
    isEdit?: boolean;
}

export default function AdForm({ initialData, isEdit = false }: AdFormProps) {
    const t = useT();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        name: initialData?.name || "",
        position: initialData?.position || "HOME_BELOW_FEATURED",
        type: initialData?.type || "SINGLE",
        items: initialData?.items || [{ imageUrl: "", linkUrl: "", altText: "" }],
        isActive: initialData?.isActive !== undefined ? initialData.isActive : true,
        isFirstTimeOnly: initialData?.isFirstTimeOnly || false,
        startDate: initialData?.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : "",
        endDate: initialData?.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : "",
        adsenseCode: initialData?.adsenseCode || "",
    });

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

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { imageUrl: "", linkUrl: "", altText: "" }]
        });
    };

    const removeItem = (index: number) => {
        const newItems = formData.items.filter((_: any, i: number) => i !== index);
        setFormData({ ...formData, items: newItems });
    };

    const updateItem = (index: number, field: string, value: string) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setFormData({ ...formData, items: newItems });
    };

    const handleImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(index);
        const data = new FormData();
        data.append("file", file);

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: data,
            });
            const json = await res.json();
            if (json.success) {
                await fetch('/api/content/media', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: file.name.replace(/\.[^/.]+$/, ''),
                        path: json.url,
                        mimeType: file.type,
                        extension: file.name.split('.').pop()?.toLowerCase(),
                        size: file.size,
                        dimensions: json.dimensions || null,
                    }),
                });
                updateItem(index, "imageUrl", json.url);
            } else {
                alert(json.message || t("ad.uploadError"));
            }
        } catch (err) {
            console.error("Upload error:", err);
            alert(t("ad.uploadError"));
        } finally {
            setUploading(null);
        }
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);

        try {
            const payload = isEdit ? { ...formData, id: initialData._id } : formData;
            if (payload.type === "ADSENSE") {
                payload.items = [];
            }

            const res = await fetch("/api/content/ad", {
                method: isEdit ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const json = await res.json();
            if (json.success) {
                router.push("/content/ad");
                router.refresh();
            } else {
                alert(json.message || t("ad.somethingWrong"));
            }
        } catch (err) {
            console.error("Failed to save ad:", err);
            alert(t("ad.saveError"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-full mx-auto pb-20 space-y-6">
            {/* Header Sticky */}
            <div className="sticky top-0 z-10 bg-gray-50/80 dark:bg-stone-900/80 backdrop-blur-md py-4 border-b border-gray-200 dark:border-stone-700/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/content/ad" className="btn-action-back">
                            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold">{isEdit ? t("ad.edit") : t("ad.create")}</h1>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-3">
                            <Link href="/content/ad" className="btn-action-secondary">
                                {t("common.cancel")}
                            </Link>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase font-black text-gray-400">{t("ad.status")}:</span>
                                <select
                                    value={formData.isActive ? "active" : "inactive"}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === "active" })}
                                    className="bg-transparent text-sm font-bold cursor-pointer outline-none text-emerald-600"
                                >
                                    <option value="active">{t("ad.active")}</option>
                                    <option value="inactive">{t("ad.inactive")}</option>
                                </select>
                            </div>
                        </div>
                        <button
                            onClick={() => handleSubmit()}
                            disabled={loading}
                            className="btn-action-primary"
                        >
                            {loading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <CheckIcon className="w-4 h-4" />}
                            {isEdit ? t("ad.edit") : t("ad.create")}
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT COLUMN: Main Config */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Basic Info */}
                    <div className="bg-white dark:bg-stone-800/40 rounded-2xl border border-gray-200 dark:border-stone-700/50 p-8 space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pl-1">
                                {t("ad.name")}
                            </label>
                            <input
                                required
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder={t("ad.namePlaceholder")}
                                className="w-full text-2xl font-bold bg-transparent border-none focus:ring-0 placeholder:text-gray-200 p-0"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pl-1 flex items-center gap-1.5">
                                     <Squares2X2Icon className="w-3 h-3" /> {t("ad.position")}
                                </label>
                                <select
                                    required
                                    value={formData.position}
                                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-stone-900/80 border-none rounded-2xl outline-none transition-all appearance-none cursor-pointer text-sm font-medium"
                                >
                                    {positions.map(p => (
                                        <option key={p.value} value={p.value}>{p.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pl-1">
                                    {t("ad.formatType")}
                                </label>
                                <select
                                    required
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-stone-900/80 border-none rounded-2xl outline-none transition-all appearance-none cursor-pointer text-sm font-medium"
                                >
                                    <option value="SINGLE">{t("ad.single")}</option>
                                    <option value="CAROUSEL">{t("ad.carousel")}</option>
                                    <option value="ADSENSE">{t("ad.adsense")}</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Ad Content / Items */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                             <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">{t("ad.adContent")}</h2>
                            {formData.type === "CAROUSEL" && (
                                <button
                                    type="button"
                                    onClick={addItem}
                                    className="flex items-center gap-1.5 text-xs font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest transition-all"
                                >
                                     <PlusIcon className="w-4 h-4" /> {t("ad.addSlide")}
                                </button>
                            )}
                        </div>

                        {formData.type === "ADSENSE" ? (
                            <div className="bg-white dark:bg-stone-800/40 rounded-3xl p-6 border border-gray-100 dark:border-stone-700/50 shadow-sm">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pl-1 mb-2">
                                    {t("ad.adsenseCode")}
                                </label>
                                <textarea
                                    required
                                    value={formData.adsenseCode}
                                    onChange={(e) => setFormData({ ...formData, adsenseCode: e.target.value })}
                                    placeholder={t("ad.adsensePlaceholder")}
                                    className="w-full h-48 px-4 py-3 bg-gray-50 dark:bg-stone-900/80 border-none rounded-xl text-sm outline-none font-mono focus:ring-1 focus:ring-emerald-500"
                                />
                                <p className="text-[10px] text-gray-400 mt-2">
                                    {t("ad.adsenseHint")}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {formData.items.map((item: any, index: number) => (
                                    <div key={index} className="bg-white dark:bg-stone-800/40 rounded-3xl p-6 border border-gray-100 dark:border-stone-700/50 shadow-sm relative group animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="flex flex-col lg:flex-row gap-8">
                                            <div className="lg:w-1/3">
                                                <div className="aspect-[16/9] bg-gray-50 dark:bg-stone-900/80 rounded-2xl overflow-hidden border-2 border-dashed border-gray-100 dark:border-stone-700/50 relative group/preview">
                                                    {item.imageUrl ? (
                                                        <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 p-4">
                                                            <PhotoIcon className="w-8 h-8 mb-2 opacity-50" />
                                                             <p className="text-[9px] font-black uppercase tracking-widest">{t("ad.noImage")}</p>
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/preview:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 gap-2">
                                                        <input
                                                            type="text"
                                                             placeholder={t("ad.directUrl")}
                                                            value={item.imageUrl}
                                                            onChange={(e) => updateItem(index, "imageUrl", e.target.value)}
                                                            className="w-full px-3 py-2 bg-white dark:bg-stone-800/40 text-[10px] rounded-xl outline-none"
                                                        />
                                                        <label className="w-full">
                                                            <div className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-xl text-center cursor-pointer transition-colors">
                                                                 {uploading === index ? t("ad.uploading") : t("ad.uploadLocal")}
                                                            </div>
                                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(index, e)} />
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="lg:w-2/3 space-y-4">
                                                <div className="space-y-1.5">
                                                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pl-1">{t("ad.targetLink")}</label>
                                                    <input
                                                        type="url"
                                                        value={item.linkUrl}
                                                        onChange={(e) => updateItem(index, "linkUrl", e.target.value)}
                                                        placeholder="https://..."
                                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-stone-900/80 border-none rounded-xl text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pl-1">{t("ad.altText")}</label>
                                                    <input
                                                        type="text"
                                                        value={item.altText}
                                                        onChange={(e) => updateItem(index, "altText", e.target.value)}
                                                        placeholder="Describe the image..."
                                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-stone-900/80 border-none rounded-xl text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {formData.type === "CAROUSEL" && formData.items.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeItem(index)}
                                                className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all"
                                            >
                                                <TrashIcon className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: Options */}
                <div className="space-y-6">
                    {/* Scheduling Card */}
                    <div className="bg-white dark:bg-stone-800/40 rounded-2xl border border-gray-200 dark:border-stone-700/50 p-6 space-y-6">
                        <h3 className="font-bold text-sm flex items-center gap-2">
                             <CalendarIcon className="w-5 h-5 text-emerald-600" /> {t("ad.scheduling")}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] uppercase font-black text-gray-400 block mb-1.5">{t("ad.startDate")}</label>
                                <input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-stone-900/80 border-none rounded-xl text-sm outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-black text-gray-400 block mb-1.5">{t("ad.endDate")}</label>
                                <input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-stone-900/80 border-none rounded-xl text-sm outline-none"
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100 dark:border-stone-700/50">
                            <Toggle
                                id="ad-first-time-toggle"
                                checked={formData.isFirstTimeOnly}
                                onChange={(e) => setFormData({ ...formData, isFirstTimeOnly: e.target.checked })}
                                label={t("ad.firstVisitOnly")}
                            />
                            <p className="text-[9px] text-gray-400 mt-2 italic">{t("ad.adDescriptionHint")}</p>
                        </div>
                    </div>

                    {/* Help Card */}
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl p-6 border border-emerald-100 dark:border-emerald-900/30">
                        <h3 className="text-emerald-700 dark:text-emerald-500 font-bold text-xs flex items-center gap-2 mb-3">
                             <InformationCircleIcon className="w-4 h-4" /> {t("ad.sizeGuide")}
                        </h3>
                        <ul className="text-[9px] text-emerald-600 dark:text-emerald-400 space-y-2 font-medium">
                            <li>• Featured Banner: 1200 x 250 px</li>
                            <li>• Sidebar Ad: 300 x 600 px</li>
                            <li>• Feed Banner: 800 x 180 px</li>
                            <li>• Leaderboard: 970 x 250 px</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
