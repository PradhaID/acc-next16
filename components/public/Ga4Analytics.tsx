"use client";

import { useEffect } from "react";

interface Ga4AnalyticsProps {
  measurementId: string;
}

// Client-rendered GA4 (gtag) that defers the external gtag.js script
// until after the page is interactive. The dataLayer/gtag queue is set up
// immediately so client-side gtag() calls can queue; the heavy external
// bundle loads when the browser is idle.
export default function Ga4Analytics({ measurementId }: Ga4AnalyticsProps) {
  useEffect(() => {
    if (typeof window === "undefined" || !measurementId) return;

    // Set up the dataLayer and gtag queue immediately
    const snippet = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${measurementId}');
`;

    const initScript = document.createElement("script");
    initScript.innerHTML = snippet;
    document.head.appendChild(initScript);

    // Defer the heavy external gtag.js script until the browser is idle
    const loadGtag = () => {
      const s = document.createElement("script");
      s.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      s.async = true;
      document.head.appendChild(s);
    };

    if ("requestIdleCallback" in window) {
      (window as any).requestIdleCallback(loadGtag, { timeout: 3000 });
    } else {
      setTimeout(loadGtag, 2000);
    }
  }, [measurementId]);

  return null;
}
