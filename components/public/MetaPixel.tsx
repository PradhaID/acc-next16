"use client";

import { useEffect } from "react";

interface MetaPixelProps {
  pixelId: string;
  testEventCode?: string;
}

// Client-rendered Meta (Facebook) Pixel that defers the external script
// until after the page is interactive (requestIdleCallback or 2s fallback).
// The pixel config is inlined immediately so fbq() calls can queue; the
// heavy third-party bundle only loads when the browser is idle.
export default function MetaPixel({ pixelId, testEventCode = "" }: MetaPixelProps) {
  useEffect(() => {
    if (typeof window === "undefined" || !pixelId) return;

    const testCode = testEventCode;

    // Inline snippet: queues fbq calls until the external script arrives
    const testWrap = testCode
      ? `var _fbq=window.fbq;window.fbq=function(){var a=[].slice.call(arguments);if(a.length>1&&typeof a[1]==='object'){a[1]['test_event_code']='${testCode}';}else if(a.length>0){a.splice(1,0,{'test_event_code':'${testCode}'});}return _fbq.apply(null,a);};`
      : "";

    const snippet = `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[]}(window, document,'script');
${testWrap}
fbq('init', '${pixelId}'${testCode ? `, {'test_event_code':'${testCode}'}` : ""});
fbq('track', 'PageView'${testCode ? `, {'test_event_code':'${testCode}'}` : ""});`;

    // Run the queue-initialiser immediately so client-side fbq() calls work
    const initScript = document.createElement("script");
    initScript.innerHTML = snippet;
    document.head.appendChild(initScript);

    // Defer the heavy external script until the browser is idle
    const loadPixel = () => {
      const s = document.createElement("script");
      s.src = "https://connect.facebook.net/en_US/fbevents.js";
      s.async = true;
      document.head.appendChild(s);
    };

    if ("requestIdleCallback" in window) {
      (window as any).requestIdleCallback(loadPixel, { timeout: 3000 });
    } else {
      setTimeout(loadPixel, 2000);
    }
  }, [pixelId, testEventCode]);

  if (!pixelId) return null;

  return (
    <noscript>
      <img
        height="1"
        width="1"
        style={{ display: "none" }}
        src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1${testEventCode ? `&test_event_code=${testEventCode}` : ""}`}
        alt=""
      />
    </noscript>
  );
}
