'use client';

import { useState } from 'react';
import { PhotoIcon, XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline';
import MediaPickerModal from '@/components/editor/MediaPickerModal';
import { useSettings } from '@/lib/settings-context';

interface Props {
    value: string;
    alt: string;
    onChange: (data: { url: string; alt: string }) => void;
    // Called after a new cover image is chosen/uploaded/generated, so the
    // parent can regenerate the og/twitter social-share variants.
    onImageChosen?: (url: string) => void;
    title?: string;
}

export default function FeaturedImagePicker({ value, alt, onChange, onImageChosen, title = "" }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [generating, setGenerating] = useState(false);
    const settings = useSettings();
    const hasGeminiKey = !!settings.gemini_api_key;

    const handleSelect = (url: string) => {
        onChange({ url, alt });
        if (onImageChosen) onImageChosen(url);
        setIsOpen(false);
    };

    const handleGenerateImage = async () => {
        if (!hasGeminiKey) return;
        const prompt = title || alt || "featured image";
        setGenerating(true);
        try {
            const res = await fetch('/api/content/post/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });
            const json = await res.json();
            if (json.success && json.imageUrl) {
                onChange({ url: json.imageUrl, alt: alt || title || "AI generated image" });
                if (onImageChosen) onImageChosen(json.imageUrl);
            } else {
                alert(json.message || "Failed to generate image");
            }
        } catch (e: any) {
            alert(e.message || "Failed to generate image");
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="bg-white dark:bg-stone-800/40 p-6 rounded-3xl border border-gray-200 dark:border-stone-700/50 shadow-sm">
            <h3 className="font-bold mb-4 flex items-center gap-2">
                <PhotoIcon className="w-5 h-5 text-orange-500" /> Cover Image
            </h3>

            <div className="space-y-4">
                <div
                    onClick={() => setIsOpen(true)}
                    className="group relative aspect-video w-full overflow-hidden rounded-2xl border-2 border-dashed bg-gray-50 border-gray-200 dark:bg-stone-900/80 dark:border-stone-700/50 hover:border-orange-400 hover:bg-orange-50/30 transition-all cursor-pointer"
                >
                    {value ? (
                        <>
                            <img src={value} className="h-full w-full object-cover shadow-inner group-hover:scale-105 transition-transform duration-500" alt={alt} />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <span className="text-xs font-bold text-white bg-black/50 px-4 py-2 rounded-full backdrop-blur-md">Change Cover</span>
                            </div>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onChange({ url: "", alt: "" });
                                }}
                                className="absolute top-2 right-2 z-10 p-1.5 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors backdrop-blur-md"
                            >
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full">
                            <div className="p-3 bg-white dark:bg-stone-800/40 rounded-2xl shadow-sm mb-2 group-hover:scale-110 transition-transform">
                                <PhotoIcon className="w-8 h-8 text-gray-300" />
                            </div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter text-center px-4">Click to select from library</span>
                        </div>
                    )}
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Image Alt Description</label>
                    <input
                        type="text"
                        value={alt}
                        onChange={(e) => onChange({ url: value, alt: e.target.value })}
                        placeholder="SEO description for image..."
                        className="w-full text-xs p-3 bg-gray-50 dark:bg-stone-900/80 border border-gray-100 dark:border-stone-700/50 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                    />
                    {hasGeminiKey && (
                        <button
                            type="button"
                            onClick={handleGenerateImage}
                            disabled={generating}
                            className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 transition-all disabled:opacity-50"
                        >
                            {generating ? (
                                <>
                                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <SparklesIcon className="w-3.5 h-3.5" />
                                    Generate Image with AI
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            <MediaPickerModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                onSelect={handleSelect}
            />
        </div>
    );
}
