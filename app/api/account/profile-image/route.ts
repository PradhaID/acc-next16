import { NextResponse } from "next/server";
import { writeFile, unlink, access, mkdir } from "fs/promises";
import { join } from "path";
import fs from "fs";
import sharp from "sharp";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { logAction, logError } from "@/lib/log";

const AVATAR_DIR = join(process.cwd(), "public", "uploads", "avatars");
const MAX_DIMENSION = 512;

async function fileExists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Allowed: JPEG, PNG, WebP, AVIF, GIF" }, { status: 400 });
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large. Max 10MB" }, { status: 400 });
    }

    const db = await getDb();
    const users = db.collection("systemUsers");

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const subDir = join(AVATAR_DIR, String(year), month);

    if (!fs.existsSync(subDir)) {
      await mkdir(subDir, { recursive: true });
    }

    const userId = session.userId;
    const filename = `avatar-${userId}.webp`;
    const filePath = join(subDir, filename);
    const relativePath = `/uploads/avatars/${year}/${month}/${filename}`;

    let sharpInstance = sharp(buffer);
    const metadata = await sharpInstance.metadata();

    if (metadata.width && metadata.height) {
      const srcW = metadata.width;
      const srcH = metadata.height;
      const cropX = parseFloat(formData.get("cropX") as string) || 0;
      const cropY = parseFloat(formData.get("cropY") as string) || 0;
      const zoom = parseFloat(formData.get("zoom") as string) || 1;

      if (cropX === 0 && cropY === 0 && zoom <= 1.01) {
        // No crop/zoom — just resize to center
        sharpInstance = sharpInstance.resize(MAX_DIMENSION, MAX_DIMENSION, {
          fit: "cover",
          position: "centre",
          kernel: sharp.kernel.lanczos3,
        });
      } else {
        const outSize = MAX_DIMENSION;
        const srcDisplayW = outSize * zoom;
        const srcDisplayH = (outSize * srcH) / srcW * zoom;

        const cropW = Math.min(srcW, Math.round(outSize * (srcW / srcDisplayW)));
        const cropH = Math.min(srcH, Math.round(outSize * (srcH / srcDisplayH)));

        const scaleSrcToPreview = (outSize * zoom) / srcW;
        const srcOffsetX = -cropX / scaleSrcToPreview;
        const srcOffsetY = -cropY / scaleSrcToPreview;

        let cropCenterX = srcW / 2 + srcOffsetX;
        let cropCenterY = srcH / 2 + srcOffsetY;

        const halfW = cropW / 2;
        const halfH = cropH / 2;
        cropCenterX = Math.max(halfW, Math.min(srcW - halfW, cropCenterX));
        cropCenterY = Math.max(halfH, Math.min(srcH - halfH, cropCenterY));

        let left = Math.round(cropCenterX - halfW);
        let top = Math.round(cropCenterY - halfH);
        left = Math.max(0, Math.min(srcW - cropW, left));
        top = Math.max(0, Math.min(srcH - cropH, top));

        sharpInstance = sharpInstance.extract({ left, top, width: cropW, height: cropH });
        sharpInstance = sharpInstance.resize(outSize, outSize, {
          fit: "cover",
          kernel: sharp.kernel.lanczos3,
        });
      }
    }

    sharpInstance = sharpInstance.webp({
      quality: 85,
      smartSubsample: true,
      effort: 6,
    });

    const optimizedBuffer = await sharpInstance.toBuffer();

    await writeFile(filePath, optimizedBuffer);

    const user = await users.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const oldImage = user.image as string | null;
    if (oldImage && oldImage !== relativePath) {
      const oldPath = join(process.cwd(), "public", oldImage);
      if (await fileExists(oldPath)) {
        await unlink(oldPath).catch(() => {});
      }
    }

    await users.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { image: relativePath } }
    );

    const originalSize = buffer.byteLength;
    const optimizedSize = optimizedBuffer.byteLength;
    const reduction = ((1 - optimizedSize / originalSize) * 100).toFixed(1);

    await logAction({
      userId: session.userId,
      username: session.username,
      action: "UPLOAD_AVATAR",
      category: "PROFILE",
      target: `user:${session.username}`,
      detail: `${originalSize}B → ${optimizedSize}B (${reduction}% reduced)`,
      oldValue: oldImage || undefined,
      newValue: relativePath,
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || undefined,
    });

    return NextResponse.json({
      success: true,
      image: relativePath,
      originalSize,
      optimizedSize,
      reduction: `${reduction}%`,
    });
  } catch (error) {
    await logError(req, "UPLOAD_AVATAR", "profile:image", error, "PROFILE");
    console.error("Profile image upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const users = db.collection("systemUsers");

    const user = await users.findOne({ _id: new ObjectId(session.userId) });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.image) {
      const oldPath = join(process.cwd(), "public", user.image as string);
      if (await fileExists(oldPath)) {
        await unlink(oldPath).catch(() => {});
      }
      await users.updateOne(
        { _id: new ObjectId(session.userId) },
        { $set: { image: null } }
      );

      await logAction({
        userId: session.userId,
        username: session.username,
        action: "DELETE_AVATAR",
        category: "PROFILE",
        target: `user:${session.username}`,
        oldValue: user.image as string,
      });
    }

    return NextResponse.json({ success: true, image: null });
  } catch (error) {
    await logError(new Request("DELETE"), "DELETE_AVATAR", "profile:image", error, "PROFILE");
    console.error("Profile image delete error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500 }
    );
  }
}
