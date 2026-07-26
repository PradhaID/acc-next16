'use client';

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function NotFoundLogger() {
  const pathname = usePathname();
  const logged = useRef(false);

  useEffect(() => {
    if (logged.current) return;
    logged.current = true;

    fetch("/api/system/notfound-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: pathname,
        referrer: document.referrer || undefined,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
