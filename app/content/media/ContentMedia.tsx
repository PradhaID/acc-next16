"use client";
import { Menu, Transition } from '@headlessui/react';
import { Fragment, useState, useEffect } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import {
    PlusIcon,
    CheckIcon,
    EllipsisVerticalIcon,
    TrashIcon,
    DocumentIcon,
    InformationCircleIcon
} from "@heroicons/react/24/outline";
import { useSearchParams, useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import SearchInput from "@/components/ui/SearchInput";
import { useSelection } from "@/lib/use-selection";
import BulkActionBar from "@/components/ui/BulkActionBar";
import { useT } from "@/components/LanguageProvider";
import { usePermission } from "@/hooks/useSession";
import { ROLES } from "@/lib/roles";

export default function ContentMedia() {
    const t = useT();
    const canUpload = usePermission(ROLES.UPLOAD_MEDIA);
    const canDelete = usePermission(ROLES.DELETE_MEDIA);
    const canBulk = usePermission(ROLES.BULK_MEDIA);
    const searchParams = useSearchParams();
    const router = useRouter();

    const [media, setMedia] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMedia, setSelectedMedia] = useState<any>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [usageDetails, setUsageDetails] = useState<any[]>([]);
    const [toast, setToast] = useState<{ show: boolean, msg: string }>({ show: false, msg: "" });
    const [isClient, setIsClient] = useState(false);
    const [search, setSearch] = useState("");

    const filteredMedia = media.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.extension && item.extension.toLowerCase().includes(search.toLowerCase()))
    );
    const mediaIds = filteredMedia.map(m => m._id);
    const selection = useSelection(mediaIds);

    async function handleBulkAction(action: string) {
        const ids = Array.from(selection.selected);
        if (action === "delete") {
            if (!confirm(`${t("media.delete")} ${ids.length} media items?`)) return;
        }
        const res = await fetch("/api/content/media/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "delete", ids }),
        });
        if (res.ok) {
            selection.clear();
            fetch("/api/content/media")
                .then(res => res.json())
                .then(json => { if (json.success) setMedia(json.data); });
        }
    }

    const showToast = (msg: string) => {
        setToast({ show: true, msg });
        setTimeout(() => setToast({ show: false, msg: "" }), 3000);
    };

    const handleCheckAndDelete = async (item: any) => {
        setSelectedMedia(item);
        try {
            const res = await fetch(`/api/content/media/check-usage?path=${item.path}`);
            const data = await res.json();
            setUsageDetails(data.usage?.details || []);
            setShowDeleteModal(true);
        } catch (error) {
            setUsageDetails([]);
            setShowDeleteModal(true);
        }
    };

    const confirmDeleteAction = async () => {
        if (!selectedMedia) return;
        const res = await fetch(`/api/content/media?id=${selectedMedia._id}`, { method: 'DELETE' });
        if (res.ok) {
            setMedia(media.filter(m => m._id !== selectedMedia._id));
            setShowDeleteModal(false);
            showToast(t("media.deleted"));
        }
    };

    useEffect(() => {
        setIsClient(true);
        fetch("/api/content/media")
            .then(res => res.json())
            .then(json => {
                if (json.success) setMedia(json.data);
                setLoading(false);
            });

        const notify = searchParams.get("notify");
        if (notify === "deleted") {
            showToast(t("media.assetRemoved"));
            router.replace("/content/media");
        } else if (notify === "uploaded") {
            showToast(t("media.mediaUploaded"));
            router.replace("/content/media");
        }
    }, [searchParams, router]);

    return (
        <>
        <div className="max-w-full mx-auto pb-20 space-y-4">
            <PageHeader
                title={t("media.title")}
                subtitle={t("media.subtitle")}
                actions={
                    canUpload && (
                        <Link
                            href="/content/media/add"
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:scale-105 active:scale-95 text-xs text-white px-3 py-2 rounded-xl font-bold shadow-md shadow-emerald-500/10 transition-all"
                        >
                            <PlusIcon className="w-4 h-4 stroke-[3px]" />
                            {t("media.uploadNew")}
                        </Link>
                    )
                }
            />

            {/* Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 bg-white dark:bg-stone-900/80 p-2 rounded-2xl border border-gray-200 dark:border-stone-700/50 shadow-sm">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <input
                        type="checkbox"
                        checked={selection.isAllSelected}
                        onChange={selection.toggleAll}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0 ml-1"
                    />
                    <SearchInput
                        value={search}
                        onChange={(v) => setSearch(v)}
                        placeholder={t("media.searchPlaceholder")}
                    />
                </div>
                <div className="flex items-center gap-2 shrink-0 text-[10px] font-black md:pl-2">
                    <span className="px-2.5 py-1.5 bg-stone-100 dark:bg-stone-800/60 text-stone-500 rounded-lg">{media.length} {t("media.total")}</span>
                </div>
            </div>

            {/* Grid Media */}
            <div className="bg-white dark:bg-stone-900/80 rounded-2xl border border-gray-200 dark:border-stone-700/50 p-6 shadow-sm">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    <Link href="/content/media/add" className="aspect-square rounded-xl border border-dashed border-stone-300 dark:border-stone-700 flex flex-col items-center justify-center gap-2 hover:border-emerald-500 hover:bg-emerald-50/10 transition-all group">
                        <div className="p-3 bg-emerald-50 dark:bg-stone-800/40 rounded-2xl group-hover:bg-emerald-100 transition-colors">
                            <PlusIcon className="w-6 h-6 text-emerald-600 stroke-[3px]" />
                        </div>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider group-hover:text-emerald-600">{t("media.uploadNew")}</span>
                    </Link>

                    {loading ? (
                        [1, 2, 3, 4, 5].map(i => <div key={i} className="aspect-square bg-stone-100 dark:bg-stone-800/60 rounded-xl animate-pulse" />)
                    ) : filteredMedia.length === 0 ? (
                        <div className="col-span-full py-16 text-center text-stone-500">
                            {t("media.noResults")}
                        </div>
                    ) : (
                        filteredMedia.map((item) => (
                            <div key={item._id} className="group relative space-y-2">
                                <div className="aspect-square relative rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800/80 group-hover:border-emerald-500 transition-all shadow-sm group-hover:shadow-md">
                                    <div className="absolute top-2 left-2 z-10">
                                        <input
                                            type="checkbox"
                                            checked={selection.isSelected(item._id)}
                                            onChange={() => selection.toggle(item._id)}
                                            className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                        />
                                    </div>
                                    <div className="absolute inset-0 rounded-xl overflow-hidden">
                                        {item.mimeType.startsWith("image/") ? (
                                            <img src={item.path} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <DocumentIcon className="w-8 h-8 text-gray-300" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute top-2 right-2 z-10">
                                        <Menu as="div" className="relative">
                                            <Menu.Button className="p-1.5 bg-white/90 hover:bg-white text-gray-700 rounded-lg shadow backdrop-blur-md transition-all border border-gray-150">
                                                <EllipsisVerticalIcon className="w-3.5 h-3.5" />
                                            </Menu.Button>
                                            <Transition
                                                as={Fragment}
                                                enter="transition ease-out duration-100"
                                                enterFrom="transform opacity-0 scale-95"
                                                enterTo="transform opacity-100 scale-100"
                                                leave="transition ease-in duration-75"
                                                leaveFrom="transform opacity-100 scale-100"
                                                leaveTo="transform opacity-0 scale-95"
                                            >
                                                <Menu.Items className="absolute right-0 mt-1 w-40 origin-top-right divide-y divide-gray-100 rounded-xl bg-white dark:bg-stone-800/40 shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none z-[60] border border-gray-100 dark:border-stone-700/50">
                                                    <div className="p-1">
                                                        <Menu.Item>
                                                            {({ active }) => (
                                                                <Link href={`/content/media/detail/${item._id}`} className={`${active ? 'bg-emerald-50 text-emerald-600' : 'text-gray-700 dark:text-stone-300'} flex w-full items-center rounded-lg px-2.5 py-2 text-xs font-bold transition-colors`}>
                                                                    <InformationCircleIcon className="mr-2 h-3.5 w-3.5" /> {t("media.details")}
                                                                </Link>
                                                            )}
                                                        </Menu.Item>
                                                        <Menu.Item>
                                                            {({ active }) => (
                                                                <button onClick={() => handleCheckAndDelete(item)} className={`${active ? 'bg-red-50 text-red-655' : 'text-red-500'} flex w-full items-center rounded-lg px-2.5 py-2 text-xs font-bold transition-colors`}>
                                                                    <TrashIcon className="mr-2 h-3.5 w-3.5" /> {t("media.delete")}
                                                                </button>
                                                            )}
                                                        </Menu.Item>
                                                    </div>
                                                </Menu.Items>
                                            </Transition>
                                        </Menu>
                                    </div>
                                </div>
                                <div className="px-1.5">
                                    <p className="text-xs font-bold text-gray-700 dark:text-stone-300 truncate">{item.name}</p>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                                        {(item.size / 1024).toFixed(0)} KB • {item.extension}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* TOAST */}
            {isClient && toast.show && createPortal(
                <div className="fixed top-24 right-8 z-[10000] animate-in fade-in slide-in-from-right-5 duration-300">
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

            {/* MODAL */}
            {isClient && showDeleteModal && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setShowDeleteModal(false)} />
                    <div className="relative z-[100000] bg-white dark:bg-stone-800/40 rounded-[2.5rem] p-8 max-w-md w-[90%] shadow-2xl animate-in fade-in zoom-in duration-200 border border-white/20">
                        <div className="flex items-center gap-4 mb-6">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${usageDetails.length > 0 ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                                <TrashIcon className="w-7 h-7" />
                            </div>
                            <div className="flex flex-col">
                                <h3 className="text-xl font-black text-gray-900 dark:text-white leading-tight">
                                    {usageDetails.length > 0 ? t("media.safeDelete") : t("media.deleteMedia")}
                                </h3>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 mt-1">{t("media.systemSecurity")}</p>
                            </div>
                        </div>

                        <div className="space-y-4 mb-8">
                            <p className="text-sm text-gray-500 dark:text-stone-400 leading-relaxed font-medium">
                                {usageDetails.length > 0
                                    ? t("media.protected")
                                    : t("media.confirmDelete")
                                }
                            </p>
                            {usageDetails.length > 0 && (
                                <div className="bg-gray-50 dark:bg-stone-900/80/50 rounded-2xl p-4 max-h-40 overflow-y-auto border border-gray-100 dark:border-stone-700/50 space-y-2">
                                    {usageDetails.map((use, i) => (
                                        <div key={i} className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight">
                                            <span className="text-emerald-500 bg-emerald-100/50 dark:bg-emerald-950/30 px-2 py-1 rounded-lg">{use.type}</span>
                                            <span className="text-gray-700 dark:text-stone-300 truncate ml-4 max-w-[150px] font-bold">{use.title}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-stone-700 transition-all text-sm">{t("media.goBack")}</button>
                            {usageDetails.length > 0 ? (
                                <div className="flex-1 py-4 rounded-2xl font-bold bg-gray-100 dark:bg-stone-700 text-gray-400 text-center text-sm cursor-not-allowed">{t("media.fileLocked")}</div>
                            ) : (
                                <button onClick={confirmDeleteAction} className="flex-1 py-4 rounded-2xl font-bold bg-red-600 text-white shadow-xl shadow-red-200 hover:scale-105 active:scale-95 transition-all text-sm">{t("media.confirmDeleteAction")}</button>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>

            {canBulk && (
                <BulkActionBar
                    count={selection.count}
                    actions={[
                        { label: t("media.delete"), action: "delete", variant: "danger", confirm: t("common.areYouSure") },
                    ]}
                    onAction={handleBulkAction}
                    onClear={selection.clear}
                />
            )}

        </>
    );
}