import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { logError } from "@/lib/log";
import fs from "fs";
import { join } from "path";
import { writeFile } from "fs/promises";
import sharp from "sharp";
import slugify from "slugify";
import Media from "@/models/content/Media";

export const maxDuration = 90;

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAME)?.value;
        const session = token ? await verifyToken(token) : null;
        if (!session) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { prompt } = body;

        if (!prompt || typeof prompt !== "string" || prompt.trim().length < 3) {
            return NextResponse.json({ success: false, message: "Prompt too short" }, { status: 400 });
        }

        const geminiKey = (await getSetting("gemini_api_key")) || "";
        if (!geminiKey) {
            return NextResponse.json({ success: false, message: "Gemini API key not configured" }, { status: 400 });
        }

        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${geminiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Generate a professional featured image for an article titled "${prompt.trim()}". Style: digital art, clean, modern, professional news photography. Only return the image, no text.`
                        }]
                    }],
                    generationConfig: { responseModalities: ["TEXT", "IMAGE"] }
                }),
                signal: AbortSignal.timeout(80000)
            }
        );

        if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`Gemini Error: ${res.status} ${errBody}`);
        }

        const data = await res.json();
        const imagePart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
        if (!imagePart) throw new Error("Gemini returned no image");

        const imageBuffer = Buffer.from(imagePart.inlineData.data, "base64");
        const mimeType = imagePart.inlineData.mimeType || "image/png";
        const ext = mimeType.includes("webp") ? "webp" : "png";

        const now = new Date();
        const year = now.getFullYear().toString();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const uploadDir = join(process.cwd(), "public", "uploads", year, month);
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        const safeSlug = slugify(prompt, { lower: true, strict: true }).substring(0, 50);
        const fileName = `${safeSlug}-${Date.now()}.${ext}`;
        const publicPath = `/uploads/${year}/${month}/${fileName}`;

        const optimizedBuffer = await sharp(imageBuffer)
            .resize(1200, 630, { fit: "cover" })
            .webp({ quality: 85 })
            .toBuffer();

        await writeFile(join(uploadDir, fileName), optimizedBuffer);

        const media = await Media.create({
            name: prompt.substring(0, 100),
            mimeType: "image/webp",
            extension: "webp",
            size: optimizedBuffer.byteLength,
            path: publicPath,
            slug: `${slugify(prompt, { lower: true, strict: true })}-${Date.now()}`,
            created: { at: now, by: session.userId },
            updated: { at: now, by: session.userId },
        });

        return NextResponse.json({
            success: true,
            imageUrl: publicPath,
            mediaId: media._id,
        });

    } catch (error: any) {
        console.error("❌ [Generate Image] Error:", error);
        await logError(req, "GENERATE_IMAGE", "content:media", error, "CONTENT");
        return NextResponse.json({ success: false, message: error.message || "Failed to generate image" }, { status: 500 });
    }
}
