import sharp from "sharp";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

function escapeXml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function wrapTitle(title: string, max = 26): string[] {
    const words = title.split(" ");
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
        if ((line + " " + w).trim().length > max && line) {
            lines.push(line.trim());
            line = w;
        } else {
            line = (line + " " + w).trim();
        }
    }
    if (line) lines.push(line.trim());
    return lines.slice(0, 4);
}

/**
 * Generate a 1200x630 Open Graph image. If `imageUrl` is provided it is
 * downloaded, cropped to cover, darkened and the title is overlaid.
 * Otherwise a branded gradient placeholder is used.
 */
export async function generateOgImage(opts: {
    title: string;
    siteName?: string;
    imageUrl?: string;
    brand?: string;
}): Promise<Buffer> {
    const { title, siteName = "boilerplate-next16", imageUrl, brand = "B" } = opts;
    const lines = wrapTitle(title);

    const titleSvg = lines
        .map(
            (l, i) =>
                `<text x="64" y="${340 + i * 64}" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="800" fill="#ffffff">${escapeXml(
                    l
                )}</text>`
        )
        .join("");

    if (imageUrl) {
        try {
            const res = await fetch(imageUrl, { cache: "no-store" });
            if (res.ok) {
                const buf = Buffer.from(await res.arrayBuffer());
                const bg = await sharp(buf)
                    .resize(OG_WIDTH, OG_HEIGHT, { fit: "cover", position: "centre" })
                    .modulate({ brightness: 0.45 })
                    .png()
                    .toBuffer();

                const overlay = Buffer.from(
                    `<svg width="${OG_WIDTH}" height="${OG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stop-color="#000000" stop-opacity="0.1"/>
                                <stop offset="100%" stop-color="#000000" stop-opacity="0.75"/>
                            </linearGradient>
                        </defs>
                        <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="url(#g)"/>
                        <circle cx="80" cy="80" r="34" fill="#f97316"/>
                        <text x="80" y="92" text-anchor="middle" font-family="Arial" font-size="40" font-weight="900" fill="#ffffff">${escapeXml(
                            brand
                        )}</text>
                        <text x="130" y="92" font-family="Arial" font-size="26" font-weight="700" fill="#fdba74">${escapeXml(
                            siteName
                        )}</text>
                        ${titleSvg}
                    </svg>`
                );

                return await sharp(bg)
                    .composite([{ input: overlay, blend: "over" }])
                    .png()
                    .toBuffer();
            }
        } catch {
            // fall through to gradient
        }
    }

    // Branded gradient fallback
    const svg = `<svg width="${OG_WIDTH}" height="${OG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#f59e0b"/>
                <stop offset="50%" stop-color="#ea580c"/>
                <stop offset="100%" stop-color="#e11d48"/>
            </linearGradient>
        </defs>
        <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="url(#bg)"/>
        <circle cx="80" cy="80" r="34" fill="#ffffff" fill-opacity="0.9"/>
        <text x="80" y="92" text-anchor="middle" font-family="Arial" font-size="40" font-weight="900" fill="#ea580c">${escapeXml(
            brand
        )}</text>
        <text x="130" y="92" font-family="Arial" font-size="26" font-weight="700" fill="#ffffff">${escapeXml(
        siteName
    )}</text>
        ${titleSvg}
    </svg>`;

    return await sharp(Buffer.from(svg)).png().toBuffer();
}
