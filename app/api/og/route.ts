import { NextRequest } from "next/server";
import { getSettings } from "@/lib/settings";
import { generateOgImage } from "@/lib/og-image";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get("title") || "";
    let img = searchParams.get("img") || undefined;

    const s = await getSettings();
    // Resolve relative upload URLs to absolute so server-side fetch works
    if (img && img.startsWith("/")) {
        const base = (s.app_url || "http://localhost:3000").replace(/\/$/, "");
        img = base + img;
    }

    const buf = await generateOgImage({
        title,
        siteName: s.app_name || "Pradha Finance",
        imageUrl: img,
        brand: "B",
    });

    return new Response(new Uint8Array(buf), {
        headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=86400, immutable",
        },
    });
}
