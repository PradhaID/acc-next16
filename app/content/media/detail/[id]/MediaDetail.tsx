"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createPortal } from "react-dom";
import {
    ArrowLeftIcon,
    CheckIcon,
    ClipboardIcon,
    PhotoIcon,
    InformationCircleIcon,
    CalendarIcon,
    DocumentIcon,
    TrashIcon,
    XMarkIcon
} from "@heroicons/react/24/outline";
import { useT } from "@/components/LanguageProvider";

export default function MediaDetail({ id }: { id: string }) {
    const t = useT();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);
    const [form, setForm] = useState<any>(null);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [usageDetails, setUsageDetails] = useState<any[]>([]);
    const [isClient, setIsClient] = useState(false);

    const [toast, setToast] = useState<{ show: boolean, msg: string }>({ show: false, msg: "" });

    const showToast = (msg: string) => {
        setToast({ show: true, msg });
        setTimeout(() => setToast({ show: false, msg: "" }), 3000);
    };

    useEffect(() => {
        setIsClient(true);
        fetch(`/api/content/media?id=${id}`)
            .then(res => res.json())
            .then(json => {
                if (json.success) setForm(json.data);
                setLoading(false);
            });

        if (searchParams.get("notify") === "uploaded") {
            showToast(t("media.mediaUploaded"));
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [id, searchParams]);

    const handleCopyLink = () => {
        const fullUrl = `${window.location.origin}${form.path}`;
        navigator.clipboard.writeText(fullUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleUpdate = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/content/media", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, description: form.description, name: form.name }),
            });
            if (res.ok) {
                showToast(t("media.updateSuccess"));
            }
        } catch (e) {
            showToast(t("media.updateFailed"));
        }
        setSaving(false);
    };

    const handleCheckAndDelete = async () => {
        try {
            const res = await fetch(`/api/content/media/check-usage?path=${form.path}`);
            const data = await res.json();
            setUsageDetails(data.usage?.details || []);
            setShowDeleteModal(true);
        } catch (error) {
            setUsageDetails([]);
            setShowDeleteModal(true);
        }
    };

    const confirmDeleteAction = async () => {
        try {
            const res = await fetch(`/api/content/media?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                router.push("/content/media?notify=deleted");
            }
        } catch (error) {
            showToast(t("media.deleteFailed"));
        }
    };

    if (loading) return <div className="p-20 text-center font-bold animate-pulse text-emerald-600">{t("media.loadingData")}</div>;

    return (
        <div className="max-w-full mx-auto pb-20 space-y-6">

            {/* TOAST PORTAL */}
            {isClient && toast.show && createPortal(
                <div className="fixed top-24 right-8 z-[9999] animate-in fade-in slide-in-from-right-5 duration-300">
                    <div className="bg-gray-900 dark:bg-white text-white dark:text-stone-100 px-6 py-4 rounded-[1.5rem] shadow-2xl flex items-center gap-3 border border-white/10 min-w-[280px]">
                        <div className="bg-emerald-500 rounded-full p-1.5 shrink-0">
                            <CheckIcon className="w-4 h-4 text-white" strokeWidth={3} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-50">{t("media.systemMessage")}</span>
                            <span className="text-sm font-bold tracking-tight">{toast.msg}</span>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Header Sticky */}
            <div className="sticky top-0 z-10 bg-gray-50/80 dark:bg-stone-900/80 backdrop-blur-md py-4 border-b border-gray-200 dark:border-stone-700/50 flex items-center justify-between px-2">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-white dark:hover:bg-stone-800/40 rounded-full border border-gray-200 transition-all">
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold">{t("media.editMedia")}</h1>
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">{t("media.manageAsset")}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleCheckAndDelete}
                        className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all border border-transparent hover:border-red-100"
                    >
                        <TrashIcon className="w-6 h-6" />
                    </button>
                    <button
                        onClick={handleUpdate}
                        disabled={saving}
                        className="bg-emerald-600 text-white flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold shadow-lg shadow-emerald-100/20 dark:shadow-none hover:scale-105 active:scale-95 transition-all text-sm"
                    >
                        {saving ? t("media.saving") : <><CheckIcon className="w-5 h-5 stroke-[3px]" /> {t("actions.update")}</>}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Preview Section */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-stone-800/40 rounded-[2.5rem] border border-gray-200 dark:border-stone-700/50 p-4 shadow-sm">
                        <div className="relative aspect-video rounded-[2rem] overflow-hidden bg-gray-50 dark:bg-stone-900/80 border border-gray-100 dark:border-stone-700/50 flex items-center justify-center group">
                            {form.mimeType.startsWith("image/") ? (
                                <img src={form.path} alt={form.name} className="max-w-full max-h-full object-contain" />
                            ) : (
                                <div className="flex flex-col items-center gap-4">
                                    <DocumentIcon className="w-24 h-24 text-gray-200" />
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{form.extension} {t("media.fileDetail")}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Metadata Edit Form */}
                    <div className="bg-white dark:bg-stone-800/40 rounded-[2.5rem] border border-gray-200 dark:border-stone-700/50 p-8 space-y-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t("media.displayName")}</label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="w-full text-2xl font-bold bg-transparent border-none focus:ring-0 p-1 border-b border-transparent focus:border-emerald-500 transition-all"
                                placeholder={t("media.displayName")}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 text-emerald-600">{t("media.descriptionAltText")}</label>
                            <textarea
                                rows={5}
                                value={form.description || ""}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                className="w-full mt-2 p-5 bg-gray-50 dark:bg-stone-900/80 border border-gray-100 dark:border-stone-700/50 rounded-[2rem] text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none transition-all"
                                placeholder={t("media.descriptionPlaceholder")}
                            />
                        </div>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-stone-800/40 p-8 rounded-[2rem] border border-gray-200 dark:border-stone-700/50 shadow-sm space-y-6">
                        <h3 className="font-bold flex items-center gap-2 text-gray-800 dark:text-stone-100 italic">
                            <InformationCircleIcon className="w-5 h-5 text-emerald-600" /> {t("media.fileProperties")}
                        </h3>

                        <div className="space-y-4">
                            {[
                                { label: t("media.format"), value: form.extension, color: "text-emerald-600" },
                                { label: t("media.fileSize"), value: `${(form.size / 1024).toFixed(2)} KB` },
                                { label: t("media.mimeType"), value: form.mimeType, small: true },
                                { label: t("media.dimensions"), value: form.dimensions || "N/A" },
                            ].map((info, i) => (
                                <div key={i} className="flex justify-between items-center border-b border-gray-50 dark:border-stone-700/50 pb-3">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{info.label}</span>
                                    <span className={`${info.small ? 'text-[10px]' : 'text-xs'} font-bold ${info.color || 'text-gray-700 dark:text-stone-300'} uppercase`}>
                                        {info.value}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-3 pt-4">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t("media.permanentUrl")}</label>
                            <div className="flex gap-2">
                                <div className="flex-1 text-[10px] p-4 bg-gray-50 dark:bg-stone-900/80 border border-gray-100 dark:border-stone-700/50 rounded-2xl truncate font-mono text-gray-500">
                                    {form.path}
                                </div>
                                <button
                                    onClick={handleCopyLink}
                                    className={`p-4 rounded-2xl transition-all shadow-lg ${copied ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100/20'}`}
                                >
                                    {copied ? <CheckIcon className="w-5 h-5" /> : <ClipboardIcon className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Safe Delete Modal (Portal) */}
            {isClient && showDeleteModal && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowDeleteModal(false)} />
                    <div className="relative bg-white dark:bg-stone-800/40 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200 border border-gray-100 dark:border-stone-700/50">
                        <div className="flex items-center gap-4 mb-6">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${usageDetails.length > 0 ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                                <TrashIcon className="w-7 h-7" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900 dark:text-white leading-tight">
                                    {usageDetails.length > 0 ? t("media.protectionActive") : t("media.confirmDeleteAction")}
                                </h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t("media.mediaSecurity")}</p>
                            </div>
                        </div>

                        <div className="space-y-4 mb-8">
                            <p className="text-sm text-gray-500 leading-relaxed">
                                {usageDetails.length > 0
                                    ? t("media.fileLinked")
                                    : t("media.deleteWarning")
                                }
                            </p>

                            {usageDetails.length > 0 && (
                                <div className="bg-gray-50 dark:bg-stone-900/80 rounded-2xl p-4 max-h-40 overflow-y-auto space-y-2 border border-gray-100 dark:border-stone-700/50">
                                    {usageDetails.map((use, i) => (
                                        <div key={i} className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight">
                                            <span className="text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-md">{use.type}</span>
                                            <span className="text-gray-700 truncate ml-4">{use.title}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-all text-sm">{t("common.cancel")}</button>
                            {usageDetails.length > 0 ? (
                                <button className="flex-1 py-4 rounded-2xl font-bold bg-gray-100 text-gray-400 cursor-not-allowed text-sm" disabled>{t("media.locked")}</button>
                            ) : (
                                <button onClick={confirmDeleteAction} className="flex-1 py-4 rounded-2xl font-bold bg-red-600 text-white shadow-xl shadow-red-100 transition-all text-sm">{t("media.deleteForever")}</button>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}