import { writeFile } from "fs/promises";
import { join } from "path";
import fs from "fs";
import slugify from "slugify";
import sharp from "sharp";
import Media from "@/models/content/Media";

export async function downloadAndSaveImage(imageUrl: string, title: string, userId: string) {
    try {
        // 1. Download Gambar
        const response = await fetch(imageUrl);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 2. Persiapkan Nama File & Path
        const safeName = slugify(title, { lower: true, strict: true }).substring(0, 50);
        const now = new Date();
        const year = now.getFullYear().toString();
        const month = String(now.getMonth() + 1).padStart(2, "0");

        const uploadDir = join(process.cwd(), "public", "uploads", year, month);
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        const filename = `${safeName}-${Date.now()}.webp`; // Kita paksa ke webp agar ringan
        const filePath = join(uploadDir, filename);
        const publicUrl = `/uploads/${year}/${month}/${filename}`;

        // 3. Optimasi dengan Sharp (WebP 85% quality)
        const optimizedBuffer = await sharp(buffer)
            .resize(1200, 630, { fit: "inside", withoutEnlargement: true })
            .webp({ quality: 85 })
            .toBuffer();

        await writeFile(filePath, optimizedBuffer);

        // 4. Catat ke Database Media (Gunakan Model Media Anda)
        const media = await Media.create({
            name: safeName,
            description: `Thumbnail for ${title}`,
            mimeType: "image/webp",
            extension: "webp",
            size: optimizedBuffer.byteLength,
            path: publicUrl,
            slug: `${safeName}-${Date.now()}`,
            created: { at: now, by: userId },
            updated: { at: now, by: userId },
        });

        return media.path; // Mengembalikan path untuk digunakan di Post
    } catch (error) {
        console.error("❌ Media Upload Error:", error);
        return null;
    }
}