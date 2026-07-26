import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { generateOgImage } from "@/lib/og-image";
import { getSettings } from "@/lib/settings";

/**
 * Generate a composite social-share image (title + branding over the
 * featured image) for a post and persist it under /public/uploads.
 *
 * Returns the relative public path (e.g. /uploads/2026/07/og-<slug>.png)
 * or null when generation is not possible (no featured image, etc.).
 * Failures are swallowed so the post save itself never fails.
 */
export async function generateSocialImageForPost(opts: {
  slug: string;
  title: string;
  featuredImageUrl?: string;
}): Promise<string | null> {
  try {
    const { slug, title, featuredImageUrl } = opts;
    if (!featuredImageUrl) return null;

    const s = await getSettings();
    const now = new Date();
    const ym = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
    const dir = join(process.cwd(), "public", "uploads", ym);
    await mkdir(dir, { recursive: true });

    const fileName = `og-${slug}.png`;
    const relPath = `/uploads/${ym}/${fileName}`;

    const buf = await generateOgImage({
      title,
      siteName: s.app_name || "My CMS",
      imageUrl: featuredImageUrl,
    });

    await writeFile(join(dir, fileName), buf);
    return relPath;
  } catch (err) {
    console.error("[generate-social] failed for", opts.slug, err);
    return null;
  }
}
