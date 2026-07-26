'use client';

import { useState, useEffect, useRef } from 'react';
import { XMarkIcon, PhotoIcon, CloudArrowUpIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function MediaPickerModal({ isOpen, onClose, onSelect }: {
    isOpen: boolean,
    onClose: () => void,
    onSelect: (url: string) => void
}) {
    const [media, setMedia] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'library' | 'upload'>('library');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchMedia = async () => {
        setLoading(true);
        const res = await fetch("/api/content/media");
        const json = await res.json();
        if (json.success) setMedia(json.data);
        setLoading(false);
    };

    useEffect(() => {
        if (isOpen) fetchMedia();
    }, [isOpen]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            // 1. Upload Fisik
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await res.json();

            if (data.success) {
                // 2. Simpan ke Database Media
                const mediaPayload = {
                    name: file.name,
                    path: data.url,
                    mimeType: file.type,
                    extension: file.name.split('.').pop(),
                    size: data.optimizedSize || file.size,
                };

                await fetch("/api/content/media", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(mediaPayload),
                });

                // 3. Langsung pilih gambar tersebut
                onSelect(data.url);
                setTab('library');
            }
        } catch (error) {
            alert("Upload failed");
        } finally {
            setUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white dark:bg-stone-900/80 w-full max-w-4xl max-h-[85vh] rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl border border-white/20">
                {/* Header with Tabs */}
                <div className="px-8 pt-8 pb-4 border-b border-gray-100 dark:border-stone-700/50">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Media Assets</h3>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600">Content Integrator</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-stone-800/40 rounded-full transition-colors">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => setTab('library')}
                            className={`pb-2 text-sm font-bold transition-all border-b-2 ${tab === 'library' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-400'}`}
                        >
                            Browse Library
                        </button>
                        <button
                            onClick={() => setTab('upload')}
                            className={`pb-2 text-sm font-bold transition-all border-b-2 ${tab === 'upload' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-400'}`}
                        >
                            Quick Upload
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50 dark:bg-stone-950/30">
                    {tab === 'library' ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {loading ? (
                                Array(10).fill(0).map((_, i) => <div key={i} className="aspect-square bg-gray-200 dark:bg-stone-800/40 rounded-2xl animate-pulse" />)
                            ) : (
                                media.map((item) => (
                                    <div key={item._id} onClick={() => onSelect(item.path)} className="group cursor-pointer space-y-2">
                                        <div className="aspect-square rounded-2xl overflow-hidden bg-white dark:bg-stone-800/40 border-2 border-transparent group-hover:border-orange-500 transition-all shadow-sm group-hover:shadow-xl relative">
                                            <img src={item.path} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            <div className="absolute inset-0 bg-orange-600/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                <CheckCircleIcon className="w-8 h-8 text-white" />
                                            </div>
                                        </div>
                                        <p className="text-[10px] font-bold text-gray-500 truncate text-center">{item.name}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center py-12">
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full max-w-md aspect-video border-2 border-dashed border-gray-300 dark:border-stone-700/50 rounded-[2rem] flex flex-col items-center justify-center gap-4 hover:border-orange-500 hover:bg-orange-50/50 transition-all cursor-pointer group"
                            >
                                {uploading ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
                                        <p className="text-sm font-bold text-orange-600">Uploading to Library...</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="p-4 bg-orange-50 dark:bg-stone-800/40 rounded-2xl group-hover:scale-110 transition-transform">
                                            <CloudArrowUpIcon className="w-10 h-10 text-orange-600" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">Click to upload image</p>
                                            <p className="text-xs text-gray-500 mt-1">Asset will be saved to your library</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}