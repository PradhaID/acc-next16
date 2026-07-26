'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSettings } from '@/lib/settings-context';

function getSessionId(): string {
    if (typeof window === 'undefined') return '';
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
        sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
}

// Admin/dashboard/account/content/system areas are never tracked.
function isPublicPage(path: string): boolean {
    const privatePrefixes = ['/dashboard', '/system', '/content', '/account', '/api'];
    return !privatePrefixes.some(prefix => path.startsWith(prefix));
}

export default function AnalyticsTracker() {
    const pathname = usePathname();
    const settings = useSettings();

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Never track logged-in (session) users or private/admin pages.
        const hasSession = document.cookie.includes('session_active=1');
        if (hasSession || !isPublicPage(pathname)) return;

        const sessionId = getSessionId();
        const url = window.location.href;
        const path = window.location.pathname;
        const referrer = document.referrer || null;

        fetch('/api/analytics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, path, referrer, sessionId }),
        }).catch(() => {});
    }, [pathname, settings.analytics_track_all]);

    return null;
}
