"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    CloudArrowUpIcon,
    ArrowLeftIcon,
    CheckIcon,
    PhotoIcon,
    DocumentIcon,
    XMarkIcon
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useT } from "@/components/LanguageProvider";

export default function MediaAdd() {
    const t = useT();
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [form, setForm] = useState({
        description: "",
        tags: [] as string[]
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0] || null;
        setFile(selected);
        if (selected && selected.type.startsWith("image/")) {
            setPreview(URL.createObjectURL(selected));
        } else {
            setPreview(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const uploadRes = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });
            const uploadData = await uploadRes.json();

            if (!uploadData.success) throw new Error(uploadData.message);

            const mediaPayload = {
                name: file.name,
                path: uploadData.url,
                mimeType: file.type,
                extension: file.name.split('.').pop(),
                size: uploadData.optimizedSize || file.size,
                description: form.description,
                tags: form.tags
            };

            const dbRes = await fetch("/api/content/media", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(mediaPayload),
            });

            const dbData = await dbRes.json();

            if (dbRes.ok && dbData.data?._id) {
                router.push(`/content/media/detail/${dbData.data._id}?notify=uploaded`);
            }
        } catch (error) {
            console.error("Upload process failed:", error);
            alert(t("media.uploadFailed"));
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-full mx-auto pb-20 space-y-6">
            {/* Header Sticky */}
            <div className="sticky top-0 z-10 bg-gray-50/80 dark:bg-stone-900/80 backdrop-blur-md py-4 border-b border-gray-200 dark:border-stone-700/50 flex items-center justify-between px-2">
                <div className="flex items-center gap-4">
                    <Link href="/content/media" className="btn-action-back">
                        <ArrowLeftIcon className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold">{t("media.uploadMedia")}</h1>
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-600">{t("media.newAsset")}</p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <Link href="/content/media" className="btn-action-secondary">
                        {t("common.cancel")}
                    </Link>
                    <button
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        className="btn-action-primary disabled:opacity-50 disabled:hover:scale-100"
                    >
                        {uploading ? t("media.saving") : <><CheckIcon className="w-4 h-4" /> {t("media.saveMedia")}</>}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Upload Area */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-stone-800/40 rounded-[2.5rem] border border-gray-200 dark:border-stone-700/50 p-8 shadow-sm">
                        {!file ? (
                            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-stone-700/50 rounded-[2rem] p-20 cursor-pointer hover:bg-orange-50/30 hover:border-orange-400 transition-all group">
                                <div className="p-5 bg-orange-50 dark:bg-stone-900/80 rounded-3xl group-hover:scale-110 transition-transform">
                                    <CloudArrowUpIcon className="w-12 h-12 text-orange-600" />
                                </div>
                                <span className="mt-4 font-bold text-gray-700 dark:text-stone-300">{t("media.dragToUpload")}</span>
                                <span className="text-[10px] uppercase font-black text-gray-400 tracking-tighter mt-1">{t("media.uploadFormats")}</span>
                                <input type="file" className="hidden" onChange={handleFileChange} />
                            </label>
                        ) : (
                            <div className="relative rounded-[2rem] overflow-hidden bg-gray-50 dark:bg-stone-900/80 border border-gray-100 dark:border-stone-700/50">
                                {preview ? (
                                    <img src={preview} alt="Preview" className="w-full h-auto max-h-[500px] object-contain mx-auto" />
                                ) : (
                                    <div className="p-20 flex flex-col items-center">
                                        <DocumentIcon className="w-20 h-20 text-orange-200" />
                                        <p className="mt-4 font-bold">{file.name}</p>
                                    </div>
                                )}
                                <button
                                    onClick={() => { setFile(null); setPreview(null); }}
                                    className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-xl"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Metadata */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-stone-800/40 p-6 rounded-3xl border border-gray-200 dark:border-stone-700/50 shadow-sm space-y-5">
                        <h3 className="font-bold flex items-center gap-2 text-gray-800 dark:text-stone-100 italic">
                            <PhotoIcon className="w-5 h-5 text-orange-600" /> {t("media.assetInfo")}
                        </h3>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t("content.description")}</label>
                            <textarea
                                rows={4}
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                placeholder={t("media.descriptionPlaceholder")}
                                className="w-full mt-1.5 p-4 bg-gray-50 dark:bg-stone-900/80 border border-gray-100 dark:border-stone-700/50 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                            />
                        </div>

                        <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-2xl border border-orange-100 dark:border-orange-900">
                            <p className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-2">{t("media.fileDetail")}</p>
                            <div className="space-y-1 text-xs font-medium">
                                <p className="truncate">{t("content.name")}: {file?.name || '-'}</p>
                                <p>{t("media.mimeType")}: {file?.type || '-'}</p>
                                <p>{t("media.fileSize")}: {file ? (file.size / 1024 / 1024).toFixed(2) : 0} MB</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}