'use client';

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeftIcon,
    PencilSquareIcon,
    TrashIcon,
    RocketLaunchIcon,
    CheckCircleIcon,
    ClockIcon,
    XMarkIcon,
    GlobeAltIcon,
    CalendarIcon,
    UserIcon,
    TagIcon,
    Squares2X2Icon,
    InformationCircleIcon,
    ShareIcon,
    CheckIcon,
    DocumentDuplicateIcon,
    BellIcon,
} from "@heroicons/react/24/outline";
import { processCodeBlocks, getImageUrl } from "@/lib/helper";

interface Post {
    _id: string;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    status: string;
    locale?: string;
    featuredImage?: {
        url: string;
        alt: string;
    };
    categories: Array<{
        _id: string;
        name: string;
        parent?: { name: string };
    }>;
    tags: string[];
    meta: {
        title?: string;
        description?: string;
        keywords?: string[];
    };
    author?: {
        _id: string;
        name: string;
    };
    created: {
        at: string;
        by?: { name: string };
    };
    updated: {
        at: string;
        by?: { name: string };
    };
    published?: {
        at?: string;
        by?: { name: string };
    };
}

interface SocialPlatform {
    enabled: boolean;
    name: string;
    icon: string;
    tokenExpired?: boolean;
    daysRemaining?: number | null;
    expiresAt?: string | null;
    authorizeUrl?: string | null;
}

interface SocialConfig {
    facebook: SocialPlatform;
    twitter: SocialPlatform;
    instagram: SocialPlatform;
    threads: SocialPlatform;
}

interface SocialPublishResult {
    success: boolean;
    postId?: string;
    error?: string;
}

export default function PostDetail({ id }: { id: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // Social Media States
    const [showSocialModal, setShowSocialModal] = useState(false);
    const [socialConfig, setSocialConfig] = useState<SocialConfig | null>(null);
    const [selectedPlatforms, setSelectedPlatforms] = useState<{
        facebook: boolean;
        twitter: boolean;
        instagram: boolean;
        threads: boolean;
        push: boolean;
    }>({ facebook: false, twitter: false, instagram: false, threads: false, push: false });
    const [socialLoading, setSocialLoading] = useState(false);
    const [socialResults, setSocialResults] = useState<Record<string, SocialPublishResult> | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetchPost();
        if (searchParams.get('created') === 'true') {
            setShowSuccessAlert(true);
            setTimeout(() => setShowSuccessAlert(false), 5000);
        }
        // Handle Threads OAuth callback results
        if (searchParams.get('threads_success') === 'true') {
            setShowSuccessAlert(true);
            setTimeout(() => setShowSuccessAlert(false), 5000);
        }
        if (searchParams.get('threads_error')) {
            alert(`Threads connection failed: ${searchParams.get('threads_error')}`);
        }
    }, [id, searchParams]);

    useEffect(() => {
        if (post) {
            document.title = `Detail Post: ${post.title}`;
        }
    }, [post]);

    // Apply code block styling enhancements
    useEffect(() => {
        if (post?.content) {
            processCodeBlocks();
            // Secondary run for safety
            const timer = setTimeout(processCodeBlocks, 500);
            return () => clearTimeout(timer);
        }
    }, [post?.content]);

    async function fetchPost() {
        setLoading(true);
        try {
            const res = await fetch(`/api/content/post?id=${id}`);
            const json = await res.json();
            if (json.success && json.data) {
                setPost(json.data);
            }
        } catch (error) {
            console.error('Error fetching post:', error);
        }
        setLoading(false);
    }

    async function fetchSocialConfig() {
        try {
            const res = await fetch('/api/social/config');
            const json = await res.json();
            if (json.success && json.data) {
                setSocialConfig(json.data);
            }
        } catch (error) {
            console.error('Error fetching social config:', error);
        }
    }

    async function handlePublish() {
        setActionLoading(true);
        try {
            const res = await fetch(`/api/content/post`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: 'published' }),
            });

            if (res.ok) {
                setShowPublishModal(false);
                fetchPost();
            } else {
                const error = await res.json();
                alert(error.message || 'Failed to publish post');
            }
        } catch (error) {
            console.error('Error publishing post:', error);
        }
        setActionLoading(false);
    }

    async function handleDelete() {
        setActionLoading(true);
        try {
            const res = await fetch(`/api/content/post?id=${id}`, { method: 'DELETE' });
            if (res.ok) router.push('/content/post');
            else alert('Failed to delete post');
        } catch (error) {
            console.error('Error deleting post:', error);
        }
        setActionLoading(false);
    }

    async function handleOpenSocialModal() {
        await fetchSocialConfig();
        setSelectedPlatforms({ facebook: false, twitter: false, instagram: false, threads: false, push: false });
        setSocialResults(null);
        setShowSocialModal(true);
    }

    async function handleSocialPublish() {
        if (!post) return;

        const selectedCount = Object.values(selectedPlatforms).filter(Boolean).length;
        if (selectedCount === 0) {
            alert('Please select at least one platform');
            return;
        }

        // Extract images from content
        const imgregex = /<img[^>]+src="([^">]+)"/g;
        const contentImages: string[] = [];
        let match;
        while ((match = imgregex.exec(post.content)) !== null) {
            contentImages.push(match[1]);
        }

        setSocialLoading(true);
        try {
            const res = await fetch('/api/social/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postId: post._id,
                    title: post.title,
                    excerpt: post.excerpt,
                    slug: post.slug,
                    featuredImage: post.featuredImage,
                    contentImages: contentImages,
                    tags: post.tags, // Added tags
                    platforms: selectedPlatforms,
                }),
            });

            const json = await res.json();
            if (json.success) {
                setSocialResults(json.data);
            } else {
                alert(json.message || 'Failed to publish to social media');
            }
        } catch (error) {
            console.error('Error publishing to social media:', error);
            alert('Failed to publish to social media');
        }

        // Handle Push Notification locally if selected (as it uses a different API usually)
        if (selectedPlatforms.push) {
            try {
                const pushRes = await fetch('/api/push/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: post.title,
                        body: post.excerpt || post.title,
                        url: `${window.location.origin}/read/${post.slug}`,
                        icon: getImageUrl('/logo.png'), // Website Favicon/Logo
                        image: getImageUrl(post.featuredImage?.url) // Post Featured Image
                    }),
                });
                const pushJson = await pushRes.json();
                setSocialResults(prev => ({
                    ...prev,
                    push: { success: pushJson.success, error: pushJson.message }
                }));
            } catch (error) {
                console.error('Error sending push notification:', error);
                setSocialResults(prev => ({
                    ...prev,
                    push: { success: false, error: 'Failed to send push notification' }
                }));
            }
        }

        setSocialLoading(false);
    }

    function togglePlatform(platform: keyof typeof selectedPlatforms) {
        setSelectedPlatforms(prev => ({
            ...prev,
            [platform]: !prev[platform],
        }));
    }

    function copyToClipboard() {
        if (!post) return;
        const fullUrl = `${window.location.origin}/read/${post.slug}`;
        navigator.clipboard.writeText(fullUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    function getPlatformIcon(platform: string) {
        switch (platform) {
            case 'facebook':
                return (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                );
            case 'twitter':
                return (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                );
            case 'instagram':
                return (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                );
            case 'threads':
                return (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm0 18.5c-3.584 0-6.5-2.916-6.5-6.5s2.916-6.5 6.5-6.5 6.5 2.916 6.5 6.5-2.916 6.5-6.5 6.5zm3.5-6.5c0 1.93-1.57 3.5-3.5 3.5s-3.5-1.57-3.5-3.5 1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5z" />
                    </svg>
                );
            case 'push':
                return <BellIcon className="w-6 h-6" />;
            default:
                return <ShareIcon className="w-6 h-6" />;
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="w-10 h-10 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 animate-pulse text-sm font-medium">Loading Post Details...</p>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                <InformationCircleIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Post not found or has been deleted.</p>
                <Link href="/content/post" className="btn-action-secondary mt-6 inline-block">Back to List</Link>
            </div>
        );
    }

    const enabledPlatforms = socialConfig ? Object.entries(socialConfig).filter(([, config]) => config.enabled) : [];

    return (
        <>
            {/* Success Toast */}
            {showSuccessAlert && (
                <div className="fixed top-6 right-6 z-[60] animate-slide-in-right">
                    <div className="bg-emerald-600 text-white rounded-2xl p-4 shadow-2xl flex items-center gap-4 min-w-[300px]">
                        <CheckCircleIcon className="w-8 h-8 opacity-80" />
                        <div>
                            <p className="font-bold">Success!</p>
                            <p className="text-xs opacity-90">Post created and saved as {post.status}</p>
                        </div>
                        <button onClick={() => setShowSuccessAlert(false)} className="ml-auto p-1 hover:bg-white/20 rounded-lg">
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            <div className="max-w-full mx-auto pb-20 space-y-6">
                {/* Sticky Header Actions */}
                <div className="sticky top-0 z-40 bg-gray-50/80 dark:bg-stone-900/80 backdrop-blur-md py-4 border-b border-stone-200 dark:border-stone-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 -mx-6 md:-mx-8 lg:-mx-10 -mt-6 md:-mt-8 lg:-mt-10 px-6 md:px-8 lg:px-10">
                    <div className="flex items-center gap-4">
                        <Link href="/content/post" className="btn-action-back">
                            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold truncate max-w-[200px] sm:max-w-md">{post.title}</h1>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${post.status === 'published' && post.published?.at && new Date(post.published.at) > new Date() ? 'bg-orange-100 text-orange-700' : post.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {post.status === 'published' && post.published?.at && new Date(post.published.at) > new Date() ? 'Scheduled' : post.status}
                                </span>
                                {post.locale && (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-200">
                                        {post.locale === 'en_US' ? 'English' : post.locale === 'id_ID' ? 'Indonesian' : post.locale}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {post.status === 'published' && (
                            <button
                                onClick={handleOpenSocialModal}
                                className="btn-action-primary"
                            >
                                <ShareIcon className="w-4 h-4" /> <span className="hidden sm:inline">Share to Social</span>
                            </button>
                        )}
                        {post.status !== 'published' && (
                            <button onClick={() => setShowPublishModal(true)} className="btn-action-primary">
                                <RocketLaunchIcon className="w-4 h-4" /> <span className="hidden sm:inline">Publish Now</span>
                            </button>
                        )}
                        <Link href={`/content/post/edit/${post._id}`} className="btn-action-secondary">
                            <PencilSquareIcon className="w-4 h-4 text-orange-600" /> <span className="hidden sm:inline">Edit Post</span>
                        </Link>
                        <button onClick={() => setShowDeleteModal(true)} className="btn-action-danger-icon">
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content Area */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white dark:bg-stone-800/40 rounded-3xl border border-gray-200 dark:border-stone-700/50 overflow-hidden shadow-sm">
                            {post.featuredImage?.url && (
                                <div className="aspect-video w-full relative">
                                    <img src={post.featuredImage.url} alt={post.featuredImage.alt} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
                                        <h2 className="text-3xl font-bold text-white leading-tight">{post.title}</h2>
                                    </div>
                                </div>
                            )}

                            <div className="p-8 space-y-8">
                                {!post.featuredImage?.url && <h2 className="text-3xl font-bold text-gray-900 dark:text-stone-100">{post.title}</h2>}

                                <div className="flex items-center gap-3 text-xs text-orange-600 bg-orange-50 dark:bg-orange-950/20 px-4 py-2 rounded-xl w-fit">
                                    <GlobeAltIcon className="w-4 h-4" />
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">URL Slug:
                                            <Link href={'/read/' + post.slug} target="_blank" className="hover:underline ml-1">
                                                {post.slug}
                                            </Link>
                                        </span>
                                        <button
                                            onClick={copyToClipboard}
                                            className="p-1 hover:bg-orange-100 dark:hover:bg-orange-900 rounded transition-colors"
                                            title="Copy full URL"
                                        >
                                            {copied ? (
                                                <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                                            ) : (
                                                <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {post.excerpt && (
                                    <div className="p-5 bg-gray-50 dark:bg-stone-900/80/50 rounded-2xl border-l-4 border-orange-500">
                                        <p className="text-gray-600 dark:text-stone-400 italic leading-relaxed">{post.excerpt}</p>
                                    </div>
                                )}

                                <div className="article-content prose prose-orange dark:prose-invert max-w-none prose-img:rounded-2xl prose-headings:font-bold prose-a:text-orange-600">
                                    <div dangerouslySetInnerHTML={{ __html: post.content }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Area */}
                    <div className="space-y-6">
                        {/* Meta Info Card */}
                        <div className="bg-white dark:bg-stone-800/40 rounded-2xl border border-gray-200 dark:border-stone-700/50 p-6 space-y-5 shadow-sm">
                            <h3 className="font-bold text-gray-900 dark:text-stone-100 flex items-center gap-2 border-b pb-3">
                                <InformationCircleIcon className="w-5 h-5 text-orange-500" /> Post Info
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gray-100 dark:bg-stone-700 rounded-lg"><UserIcon className="w-4 h-4" /></div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Author</p>
                                        <p className="text-sm font-medium">{post.author?.name || 'Admin'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gray-100 dark:bg-stone-700 rounded-lg"><CalendarIcon className="w-4 h-4" /></div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Created At</p>
                                        <p className="text-sm font-medium">{new Date(post.created.at).toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
                                    </div>
                                </div>
                                {post.published?.at && (
                                    <div className="flex items-center gap-3 text-emerald-600">
                                        <div className="p-2 bg-emerald-50 rounded-lg"><RocketLaunchIcon className="w-4 h-4" /></div>
                                        <div>
                                            <p className="text-[10px] uppercase font-bold opacity-70">Published / Scheduled</p>
                                            <p className="text-sm font-medium">{new Date(post.published.at).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Taxonomy Card */}
                        <div className="bg-white dark:bg-stone-800/40 rounded-2xl border border-gray-200 dark:border-stone-700/50 p-6 space-y-5 shadow-sm">
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2"><Squares2X2Icon className="w-4 h-4" /> Categories</h4>
                                <div className="flex flex-wrap gap-2">
                                    {post.categories.map(cat => (
                                        <span key={cat._id} className="px-3 py-1 bg-orange-50 text-orange-700 rounded-lg text-xs font-medium">
                                            {cat.parent?.name && `${cat.parent.name} › `}{cat.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="pt-4 border-t space-y-4">
                                <h4 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2"><TagIcon className="w-4 h-4" /> Tags</h4>
                                <div className="flex flex-wrap gap-2">
                                    {post.tags.map((tag, i) => (
                                        <span key={i} className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold uppercase">#{tag}</span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* SEO Analytics Preview */}
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-2xl p-6 space-y-4">
                            <h3 className="font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-300"><GlobeAltIcon className="w-5 h-5" /> SEO Overview</h3>
                            <div className="space-y-3">
                                <div className="bg-white/70 dark:bg-stone-800/40 p-3 rounded-xl border border-amber-200/50 dark:border-amber-900/30">
                                    <p className="text-[10px] uppercase font-bold text-amber-600/70 dark:text-amber-400/70">Meta Title</p>
                                    <p className="text-sm font-medium text-stone-800 dark:text-stone-100 line-clamp-1 mt-0.5">{post.meta.title || post.title}</p>
                                </div>
                                <div className="bg-white/70 dark:bg-stone-800/40 p-3 rounded-xl border border-amber-200/50 dark:border-amber-900/30">
                                    <p className="text-[10px] uppercase font-bold text-amber-600/70 dark:text-amber-400/70">Meta Description</p>
                                    <p className="text-xs text-stone-600 dark:text-stone-300 line-clamp-3 mt-0.5">{post.meta.description || post.excerpt || 'No meta description set.'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            {/* Modal Publish */}
            {showPublishModal && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white dark:bg-stone-800/40 rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center animate-scale-in">
                        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <RocketLaunchIcon className="w-10 h-10 text-orange-600" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Publish Post?</h3>
                        <p className="text-gray-500 text-sm mb-8">This will make your content visible to everyone on the website.</p>
                        <div className="flex gap-3">
                            <button onClick={handlePublish} disabled={actionLoading} className="btn-modal-primary">
                                {actionLoading ? 'Publishing...' : 'Yes, Publish'}
                            </button>
                            <button onClick={() => setShowPublishModal(false)} className="btn-modal-secondary">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Delete */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white dark:bg-stone-800/40 rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center animate-scale-in">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <TrashIcon className="w-10 h-10 text-red-600" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Delete Post?</h3>
                        <p className="text-gray-500 text-sm mb-8">This action is permanent and cannot be undone. Are you sure?</p>
                        <div className="flex gap-3">
                            <button onClick={handleDelete} disabled={actionLoading} className="btn-modal-danger">
                                {actionLoading ? 'Deleting...' : 'Delete Now'}
                            </button>
                            <button onClick={() => setShowDeleteModal(false)} className="btn-modal-secondary">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Social Media Publish Modal */}
            {showSocialModal && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white dark:bg-stone-800/40 rounded-3xl shadow-2xl max-w-md w-full p-8 animate-scale-in">
                        {!socialResults ? (
                            <>
                                <div className="text-center mb-6">
                                    <div className="w-20 h-20 bg-gradient-to-br from-orange-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <ShareIcon className="w-10 h-10 text-white" />
                                    </div>
                                    <h3 className="text-2xl font-bold mb-2">Share to Social Media</h3>
                                    <p className="text-gray-500 text-sm">Choose platforms to publish this article</p>
                                </div>

                                <div className="space-y-3 mb-6">
                                    {socialConfig && enabledPlatforms.length > 0 ? (
                                        [...enabledPlatforms, ['push', { name: 'Browser / Phone Push', enabled: true }]].map(([key, config]: any) => {
                                            const isThreadsExpired = key === 'threads' && config.tokenExpired;
                                            const threadsDaysLeft = key === 'threads' && config.daysRemaining !== null && config.daysRemaining !== undefined ? config.daysRemaining : null;

                                            // Show reconnect button for expired Threads token
                                            if (isThreadsExpired && config.authorizeUrl) {
                                                return (
                                                    <div key={key} className="w-full p-4 rounded-2xl border-2 border-red-200 bg-red-50 dark:bg-red-950/30">
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <div className="p-2 rounded-xl scale-95 bg-black text-white">
                                                                {getPlatformIcon(key)}
                                                            </div>
                                                            <div className="text-left">
                                                                <p className="font-bold">{config.name}</p>
                                                                <p className="text-xs text-red-600 font-medium">Token expired — reconnect required</p>
                                                            </div>
                                                        </div>
                                                        <a
                                                            href={config.authorizeUrl}
                                                            className="block w-full text-center bg-black text-white py-2.5 rounded-xl font-bold text-sm hover:bg-gray-800 transition-all"
                                                        >
                                                            🔗 Reconnect Threads
                                                        </a>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <button
                                                    key={key}
                                                    onClick={() => togglePlatform(key as keyof typeof selectedPlatforms)}
                                                    className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${selectedPlatforms[key as keyof typeof selectedPlatforms]
                                                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20'
                                                        : 'border-gray-200 dark:border-stone-700/50 hover:border-gray-300'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-xl scale-95 ${key === 'facebook' ? 'bg-orange-100 text-orange-600' :
                                                            key === 'twitter' ? 'bg-gray-100 text-gray-800' :
                                                                key === 'threads' ? 'bg-black text-white' :
                                                                    key === 'push' ? 'bg-orange-600 text-white' :
                                                                        'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                                                            }`}>
                                                            {getPlatformIcon(key)}
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="font-bold">{config.name}</p>
                                                            <p className="text-xs text-gray-500">
                                                                {key === 'instagram' && !post?.featuredImage?.url
                                                                    ? 'Requires featured image'
                                                                    : key === 'threads' && threadsDaysLeft !== null
                                                                        ? threadsDaysLeft <= 14
                                                                            ? `⚠️ Token expires in ${threadsDaysLeft} days`
                                                                            : `Token valid (${threadsDaysLeft} days left)`
                                                                        : 'Ready to publish'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedPlatforms[key as keyof typeof selectedPlatforms]
                                                        ? 'border-orange-500 bg-orange-500'
                                                        : 'border-gray-300'
                                                        }`}>
                                                        {selectedPlatforms[key as keyof typeof selectedPlatforms] && (
                                                            <CheckIcon className="w-4 h-4 text-white" />
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            <InformationCircleIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                            <p>No social media platforms configured</p>
                                            <p className="text-sm">Add API credentials in your .env file</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={handleSocialPublish}
                                        disabled={socialLoading || enabledPlatforms.length === 0 || Object.values(selectedPlatforms).every(v => !v)}
                                        className="btn-modal-primary"
                                    >
                                        {socialLoading ? 'Publishing...' : 'Share Now'}
                                    </button>
                                    <button
                                        onClick={() => setShowSocialModal(false)}
                                        className="btn-modal-secondary"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="text-center mb-6">
                                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircleIcon className="w-10 h-10 text-emerald-600" />
                                    </div>
                                    <h3 className="text-2xl font-bold mb-2">Published!</h3>
                                    <p className="text-gray-500 text-sm">Results from social media platforms</p>
                                </div>

                                <div className="space-y-3 mb-6">
                                    {Object.entries(socialResults).map(([platform, result]) => (
                                        <div
                                            key={platform}
                                            className={`flex items-center justify-between p-4 rounded-2xl ${result.success
                                                ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200'
                                                : 'bg-red-50 dark:bg-red-950/30 border border-red-200'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-xl scale-95 ${platform === 'facebook' ? 'bg-orange-100 text-orange-600' :
                                                    platform === 'twitter' ? 'bg-gray-100 text-gray-800' :
                                                        platform === 'threads' ? 'bg-black text-white' :
                                                            platform === 'push' ? 'bg-orange-600 text-white' :
                                                                'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                                                    }`}>
                                                    {getPlatformIcon(platform)}
                                                </div>
                                                <div>
                                                    <p className="font-bold capitalize">{platform}</p>
                                                    <p className={`text-xs ${result.success ? 'text-emerald-600' : 'text-red-600'}`}>
                                                        {result.success ? 'Published successfully' : result.error}
                                                    </p>
                                                </div>
                                            </div>
                                            {result.success ? (
                                                <CheckCircleIcon className="w-6 h-6 text-emerald-500" />
                                            ) : (
                                                <XMarkIcon className="w-6 h-6 text-red-500" />
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => {
                                        setShowSocialModal(false);
                                        setSocialResults(null);
                                    }}
                                    className="w-full btn-modal-secondary"
                                >
                                    Close
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            <style jsx global>{`
                @keyframes slide-in-right {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes scale-in {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .animate-slide-in-right { animation: slide-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
                .animate-scale-in { animation: scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
            `}</style>
        </>
    );
}
