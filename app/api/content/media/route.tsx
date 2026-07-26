import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { logAction, logError } from "@/lib/log";
import connectDB from "@/lib/db";
import Media from "@/models/content/Media";
import slugify from "slugify";
import { unlink } from "fs/promises";
import { join } from "path";

async function generateUniqueSlug(base: string) {
    let slug = slugify(base, { lower: true, strict: true });
    let counter = 1;

    while (await Media.exists({ slug })) {
        counter++;
        slug = `${slugify(base, { lower: true, strict: true })}-${counter}`;
    }

    return slug;
}

async function deletePhysicalFile(filePath: string) {
    try {
        const fullPath = join(process.cwd(), "public", filePath);
        await unlink(fullPath);
    } catch {
        // File may already be gone or path invalid — silent fail
    }
}

/* =========================
   GET
========================= */
export async function GET(req: Request) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        // Single media
        if (id) {
            const media = await Media.findById(id)
                .populate("created.by", "name email")
                .populate("updated.by", "name email");

            if (!media) {
                return NextResponse.json(
                    { success: false, message: "Media not found" },
                    { status: 404 }
                );
            }

            return NextResponse.json({ success: true, data: media });
        }

        // List media with pagination + search
        const search = searchParams.get("search") || "";
        const page = parseInt(searchParams.get("page") || "1", 10);
        const limit = parseInt(searchParams.get("limit") || "50", 10);

        const filter: Record<string, unknown> = { "deleted.at": null };

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { tags: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
            ];
        }

        const total = await Media.countDocuments(filter);

        const media = await Media.find(filter)
            .sort({ "created.at": -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        return NextResponse.json({
            success: true,
            data: media,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("GET /api/content/media error:", error);
        await logError(req, "LIST_MEDIA", "content:media", error, "CONTENT");
        return NextResponse.json(
            { success: false, message: "Failed to fetch media" },
            { status: 500 }
        );
    }
}

/* =========================
   POST
========================= */
export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAME)?.value;
        const session = token ? await verifyToken(token) : null;

        if (!session) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        await connectDB();

        const body = await req.json();
        const userId = session.userId;
        const now = new Date();

        if (!body.name || !body.path || !body.mimeType) {
            return NextResponse.json(
                { success: false, message: "Invalid payload" },
                { status: 400 }
            );
        }

        const slug = await generateUniqueSlug(body.name);

        const media = await Media.create({
            name: body.name,
            description: body.description || null,
            mimeType: body.mimeType,
            extension: body.extension,
            size: body.size,
            path: body.path,
            dimensions: body.dimensions || null,
            slug,
            tags: body.tags || [],
            created: { at: now, by: userId },
            updated: { at: now, by: userId },
        });

        await logAction({
            userId: session.userId,
            username: session.username,
            action: "UPLOAD_MEDIA",
            category: "CONTENT",
            target: `media:${media._id}`,
            detail: `Uploaded "${body.name}" (${body.mimeType})`,
        });

        return NextResponse.json(
            { success: true, data: media },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("POST /api/content/media error:", error);

        if (error.code === 11000) {
            return NextResponse.json(
                {
                    success: false,
                    code: "DUPLICATE_KEY",
                    message: "Slug already used",
                    fields: { slug: "Slug already exists" },
                },
                { status: 409 }
            );
        }

        await logError(req, "UPLOAD_MEDIA", "content:media", error, "CONTENT");

        return NextResponse.json(
            { success: false, message: "Failed to save media" },
            { status: 500 }
        );
    }
}

/* =========================
   PUT
========================= */
export async function PUT(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAME)?.value;
        const session = token ? await verifyToken(token) : null;

        if (!session) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        await connectDB();

        const body = await req.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, message: "Media ID is required" },
                { status: 400 }
            );
        }

        if (updateData.slug) {
            const exists = await Media.findOne({
                slug: updateData.slug,
                _id: { $ne: id },
            });

            if (exists) {
                return NextResponse.json(
                    {
                        success: false,
                        message: "Slug already used by another media",
                        fields: { slug: "Slug already used" },
                    },
                    { status: 409 }
                );
            }
        }

        updateData.updated = {
            at: new Date(),
            by: session.userId,
        };

        const media = await Media.findByIdAndUpdate(id, updateData, {
            returnDocument: 'after',
        });

        if (!media) {
            return NextResponse.json(
                { success: false, message: "Media not found" },
                { status: 404 }
            );
        }

        await logAction({
            userId: session.userId,
            username: session.username,
            action: "EDIT_MEDIA",
            category: "CONTENT",
            target: `media:${id}`,
            detail: `Updated media ${id}`,
        });

        return NextResponse.json({ success: true, data: media });
    } catch (error) {
        console.error("PUT /api/content/media error:", error);
        await logError(req, "EDIT_MEDIA", "content:media", error, "CONTENT");
        return NextResponse.json(
            { success: false, message: "Failed to update media" },
            { status: 500 }
        );
    }
}

/* =========================
   DELETE (SOFT + FILE CLEANUP)
========================= */
export async function DELETE(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAME)?.value;
        const session = token ? await verifyToken(token) : null;

        if (!session) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        await connectDB();

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { success: false, message: "Media ID is required" },
                { status: 400 }
            );
        }

        const media = await Media.findById(id);
        if (!media) {
            return NextResponse.json(
                { success: false, message: "Media not found" },
                { status: 404 }
            );
        }

        // Remove physical file from disk
        if (media.path) {
            await deletePhysicalFile(media.path);
        }

        // Soft-delete the record
        await Media.findByIdAndUpdate(id, {
            deleted: {
                at: new Date(),
                by: session.userId,
            },
        });

        await logAction({
            userId: session.userId,
            username: session.username,
            action: "DELETE_MEDIA",
            category: "CONTENT",
            target: `media:${id}`,
            detail: `Deleted "${media.name}" and removed file from disk`,
            oldValue: media.path,
            level: "WARN",
        });

        return NextResponse.json({
            success: true,
            message: "Media deleted successfully",
        });
    } catch (error) {
        console.error("DELETE /api/content/media error:", error);
        await logError(req, "DELETE_MEDIA", "content:media", error, "CONTENT");
        return NextResponse.json(
            { success: false, message: "Failed to delete media" },
            { status: 500 }
        );
    }
}
