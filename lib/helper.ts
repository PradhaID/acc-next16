"use client";

import hljs from 'highlight.js';

export const getImageUrl = (url: string | undefined) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const cleanPath = url.startsWith('/') ? url : `/${url}`;

    return `${cleanBaseUrl}${cleanPath}`;
};

export interface RelatedPost {
    _id: string;
    title: string;
    slug: string;
    excerpt?: string;
    featuredImage?: { url: string; alt?: string };
    categories: { _id: string; name: string; slug: string }[];
    author: { name: string };
    published?: { at: string };
    created: { at: string };
}

export async function getRelatedPosts(
    currentSlug: string,
    categoryIds: string[],
    limit: number = 4
): Promise<RelatedPost[]> {
    try {
        // Build query params
        const params = new URLSearchParams({
            status: 'published',
            limit: limit.toString(),
            exclude: currentSlug,
        });

        // Add category filter if available
        if (categoryIds.length > 0) {
            params.append('category', categoryIds[0]);
        }

        const res = await fetch(`/api/content/post?${params.toString()}`, {
            cache: 'no-store',
        });

        const json = await res.json();

        if (json.success && json.data) {
            return json.data;
        }

        return [];
    } catch (error) {
        console.error('Error fetching related posts:', error);
        return [];
    }
}


/**
 * Shared logic to enhance HTML code blocks with Mac-style headers and copy buttons.
 * Targets elements within container has .article-content class by default.
 */
export function processCodeBlocks() {
    const preBlocks = document.querySelectorAll<HTMLPreElement>('.article-content pre');

    preBlocks.forEach((pre) => {
        // Highlight the code block first
        const codeTag = pre.querySelector('code');
        if (codeTag && !codeTag.hasAttribute('data-highlighted')) {
            // Clean up content: AI often returns \n as <br/> or literal \n
            let content = codeTag.innerHTML;

            // Convert <br> tags to real newlines
            content = content.replace(/<br\s*\/?>/gi, '\n');

            // Strip any other HTML tags that might have leaked in
            const temp = document.createElement('div');
            temp.innerHTML = content;
            let cleanText = temp.textContent || '';

            // Trim messy leading/trailing newlines
            cleanText = cleanText.replace(/^\s*[\r\n]/, '').replace(/[\r\n]\s*$/, '');

            codeTag.textContent = cleanText;

            hljs.highlightElement(codeTag);
            codeTag.setAttribute('data-highlighted', 'true');
        }

        // Avoid adding multiple buttons
        if (pre.parentElement?.classList.contains('code-block-container')) return;

        // Create container
        const container = document.createElement('div');
        container.className = 'code-block-container relative my-6 rounded-xl overflow-hidden border border-gray-200 dark:border-stone-700/50 group';

        // Create header bar
        const header = document.createElement('div');
        header.className = 'flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-stone-900/80 border-b border-gray-200 dark:border-stone-700/50';

        // Attempt to detect language from class
        const langClass = Array.from(codeTag?.classList || []).find(c => c.startsWith('language-'));
        const lang = langClass ? langClass.replace('language-', '').toUpperCase() : 'CODE';

        header.innerHTML = `
            <div class="flex items-center gap-2">
                <div class="flex gap-1.5">
                    <span class="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                    <span class="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
                    <span class="w-2.5 h-2.5 rounded-full bg-green-400"></span>
                </div>
                <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">${lang}</span>
            </div>
        `;

        // Create Copy Button
        const copyBtn = document.createElement('button');
        copyBtn.className = 'flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-emerald-600 dark:text-stone-400 dark:hover:text-emerald-400 transition-colors cursor-pointer';
        copyBtn.innerHTML = `
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
            <span>Copy</span>
        `;

        copyBtn.onclick = async () => {
            const text = pre.textContent || '';
            try {
                await navigator.clipboard.writeText(text);
                copyBtn.innerHTML = `
                    <svg class="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    <span class="text-green-500 font-bold">Copied!</span>
                `;
                setTimeout(() => {
                    copyBtn.innerHTML = `
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                        <span>Copy</span>
                    `;
                }, 2000);
            } catch (err) {
                console.error('Failed to copy!', err);
            }
        };

        header.appendChild(copyBtn);

        // Wrap the pre
        pre.parentNode?.insertBefore(container, pre);
        container.appendChild(header);
        container.appendChild(pre);
    });
}
