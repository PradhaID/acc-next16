import { NextResponse } from "next/server";
import { writeFile, access } from "fs/promises";
import { join } from "path";
import slugify from "slugify";
import fs from "fs";
import sharp from "sharp";

import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

const ALLOWED_TYPES = new Set([
    "image/jpeg", "image/png", "image/webp", "image/avif", "image/gif",
    "application/pdf",
    "video/mp4", "video/webm",
    "audio/mpeg", "audio/wav",
    "text/plain", "text/csv",
    "application/zip",
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const MAX_DIMENSION = 1600;

async function fileExists(path: string) {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
}

export async function POST(req: Request) {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;

    if (!session) {
        return NextResponse.json(
            { success: false, message: "Unauthorized" },
            { status: 401 }
        );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
        return NextResponse.json(
            { success: false, message: "No file uploaded" },
            { status: 400 }
        );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json(
            { success: false, message: `File type "${file.type}" is not allowed` },
            { status: 400 }
        );
    }

    if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
            { success: false, message: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
            { status: 400 }
        );
    }

    try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const baseName = file.name.replace(/\.[^/.]+$/, "");
        const safeName = slugify(baseName, { lower: true, strict: true });

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");

        const uploadDir = join(process.cwd(), "public", "uploads", String(year), month);

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Non-image files: save as-is
        if (!IMAGE_TYPES.has(file.type) && file.type !== "image/gif") {
            const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
            let filename = `${safeName}.${ext}`;
            let counter = 1;
            while (await fileExists(`${uploadDir}/${filename}`)) {
                counter++;
                filename = `${safeName}-${counter}.${ext}`;
            }
            const filePath = `${uploadDir}/${filename}`;
            await writeFile(filePath, buffer);

            return NextResponse.json({
                success: true,
                url: `/uploads/${year}/${month}/${filename}`,
                filename,
                size: buffer.byteLength,
            });
        }

        // Image processing: always convert to WebP
        let sharpInstance = sharp(buffer);
        const metadata = await sharpInstance.metadata();

        // Resize if oversized
        if (metadata.width && metadata.height &&
            (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION)) {
            sharpInstance = sharpInstance
                .resize(MAX_DIMENSION, MAX_DIMENSION, {
                    fit: "inside",
                    withoutEnlargement: true,
                    kernel: sharp.kernel.lanczos3,
                })
                .sharpen({ sigma: 1.0, m1: 1.0, m2: 2.0 });
        } else if (metadata.width && metadata.width > 300) {
            sharpInstance = sharpInstance.sharpen({ sigma: 0.5 });
        }

        // Animated GIF: keep as GIF (WebP animation support inconsistent)
        if (file.type === "image/gif") {
            let filename = `${safeName}.gif`;
            let counter = 1;
            while (await fileExists(`${uploadDir}/${filename}`)) {
                counter++;
                filename = `${safeName}-${counter}.gif`;
            }
            const filePath = `${uploadDir}/${filename}`;
            await writeFile(filePath, buffer);

            return NextResponse.json({
                success: true,
                url: `/uploads/${year}/${month}/${filename}`,
                filename,
                originalSize: buffer.byteLength,
                optimizedSize: buffer.byteLength,
                reduction: "0%",
                dimensions: metadata.width && metadata.height
                    ? `${metadata.width}x${metadata.height}`
                    : undefined,
            });
        }

        // All other images: convert to WebP
        let filename = `${safeName}.webp`;
        let counter = 1;
        while (await fileExists(`${uploadDir}/${filename}`)) {
            counter++;
            filename = `${safeName}-${counter}.webp`;
        }

        const optimizedBuffer = await sharpInstance
            .webp({ quality: 85, smartSubsample: true, effort: 6 })
            .toBuffer();

        const filePath = `${uploadDir}/${filename}`;
        await writeFile(filePath, optimizedBuffer);

        const originalSize = buffer.byteLength;
        const optimizedSize = optimizedBuffer.byteLength;
        const reduction = ((1 - optimizedSize / originalSize) * 100).toFixed(1);

        return NextResponse.json({
            success: true,
            url: `/uploads/${year}/${month}/${filename}`,
            filename,
            originalSize,
            optimizedSize,
            reduction: `${reduction}%`,
            dimensions: metadata.width && metadata.height
                ? `${metadata.width}x${metadata.height}`
                : undefined,
        });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "Upload failed",
            },
            { status: 500 }
        );
    }
}
