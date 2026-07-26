import sharp from "sharp";
import { join } from "path";
import fs from "fs";

/**
 * Post-processes article HTML for better performance & SEO:
 * - adds loading="lazy" + decoding="async" to images
 * - adds intrinsic width/height (from local uploads) so the browser can
 *   reserve space and avoid layout shift / aspect-ratio distortion
 * - adds referrerpolicy + modern-friendly attributes
 */
export async function processArticleHtml(html: string): Promise<string> {
    if (!html) return html;

    const imgRegex = /<img\b([^>]*)>/gi;
    const matches = [...html.matchAll(imgRegex)];
    if (matches.length === 0) return html;

    const replacements = await Promise.all(
        matches.map(async (m) => {
            const attrs = m[1];

            // Already has loading? leave as is but ensure async decode.
            const hasLazy = /\sloading\s*=/i.test(attrs);
            let newAttrs = attrs.trim();

            // Extract src
            const srcMatch = attrs.match(/src\s*=\s*["']([^"']+)["']/i);
            const src = srcMatch ? srcMatch[1] : "";

            // Only compute dimensions for local uploads (avoid remote fetch cost)
            let dims = "";
            if (src && src.startsWith("/uploads/")) {
                try {
                    const filePath = join(process.cwd(), "public", src);
                    if (fs.existsSync(filePath)) {
                        const meta = await sharp(filePath).metadata();
                        if (meta.width && meta.height) {
                            dims = ` width="${meta.width}" height="${meta.height}"`;
                        }
                    }
                } catch {
                    /* ignore */
                }
            }

            newAttrs = newAttrs.replace(/\s*\/?>$/, "");
            newAttrs = newAttrs.replace(/\s+$/, "");

            const lazy = hasLazy ? "" : ' loading="lazy"';
            const extra =
                ' decoding="async" referrerpolicy="no-referrer"';

            return {
                from: m[0],
                to: `<img ${newAttrs}${dims}${lazy}${extra}>`,
            };
        })
    );

    let result = html;
    for (const r of replacements) {
        result = result.replace(r.from, r.to);
    }
    return result;
}
