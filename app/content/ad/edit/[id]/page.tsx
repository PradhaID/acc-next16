'use client';

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdForm from "../../AdForm";
import Link from "next/link";
import { ChevronLeftIcon, InboxIcon } from "@heroicons/react/24/outline";
import { useT } from "@/components/LanguageProvider";

export default function EditAdPage() {
    const t = useT();
    const { id } = useParams();
    const [ad, setAd] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchAd();
    }, [id]);

    async function fetchAd() {
        setLoading(true);
        try {
            const res = await fetch(`/api/content/ad?id=${id}`);
            const json = await res.json();
            if (json.success) {
                setAd(json.data);
            }
        } catch (err) {
            console.error("Failed to fetch ad:", err);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto py-24 text-center">
                <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">{t("ad.loading")}</p>
            </div>
        );
    }

    if (!ad) {
        return (
            <div className="max-w-4xl mx-auto py-24 text-center space-y-4">
                <InboxIcon className="w-16 h-16 text-gray-200 dark:text-stone-300 mx-auto" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t("ad.adNotFound")}</h2>
                <p className="text-gray-500">The advertisement you are looking for does not exist or has been deleted.</p>
                <Link href="/content/ad" className="inline-block px-6 py-2 bg-orange-600 text-white rounded-xl shadow-lg hover:bg-orange-700 transition-colors uppercase text-xs font-black tracking-widest">
                    {t("ad.goBack")}
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-full mx-auto animate-in fade-in slide-in-from-top-4 duration-500 pb-20">
            {/* Ad Form */}
            <AdForm initialData={ad} isEdit={true} />
        </div>
    );
}
