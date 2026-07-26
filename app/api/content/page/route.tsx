import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { logAction, logError } from "@/lib/log";
import connectDB from "@/lib/db";
import Page from "@/models/content/Page";
import { getSetting } from "@/lib/settings";
import sharp from "sharp";
import fs from "fs";
import { join } from "path";
import { writeFile } from "fs/promises";

/* =========================
   GET
========================= */
export async function GET(req: Request) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        const status = searchParams.get("status");
        const parent = searchParams.get("parent");
        const menuGroup = searchParams.get("menuGroup");
        const search = searchParams.get("search") || "";
        const page = parseInt(searchParams.get("page") || "1", 10);
        const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

        // Get single page
        if (id) {
            const page = await Page.findById(id)
                .populate("parent", "title slug")
                .populate("author", "name email")
                .populate("created.by", "name email")
                .populate("updated.by", "name email")
                .populate("published.by", "name email");

            if (!page) {
                return NextResponse.json(
                    { success: false, message: "Page not found" },
                    { status: 404 }
                );
            }

            return NextResponse.json({ success: true, data: page });
        }

        // List pages
        const query: any = { isActive: true };

        if (status && status !== "all") {
            query.status = status;
        }

        if (parent) {
            query.parent = parent === "root" ? null : parent;
        }

        if (menuGroup && menuGroup !== 'all') {
            query.menuGroup = menuGroup;
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { slug: { $regex: search, $options: "i" } },
            ];
        }

        const total = await Page.countDocuments(query);

        const pages = await Page.find(query)
            .populate("parent", "title slug")
            .populate("author", "name email")
            .sort({ parent: 1, menuOrder: 1, title: 1 })
            .skip((page - 1) * pageSize)
            .limit(pageSize);

        return NextResponse.json({ success: true, data: pages, total });
    } catch (error) {
        console.error("GET /api/content/page error:", error);
        await logError(req, "LIST_PAGE", "content:pages", error, "CONTENT");
        return NextResponse.json(
            { success: false, message: "Failed to fetch pages" },
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
            const now = new Date().toISOString();

            // Clean client-side fields (NOT published — preserve for scheduling)
            delete body.author;
            delete body.created;
            delete body.updated;

            // Handle published date
            let published = body.published || null;
            if (body.status === 'published' && (!published || !published.at)) {
                published = { at: now, by: userId };
            } else if (published && published.at && !published.by) {
                published.by = userId;
            }

            const page = await Page.create({
                ...body,
                author: userId,
                published,
                created: { at: now, by: userId },
                updated: { at: now, by: userId },
            });

            const populatedPage = await Page.findById(page._id)
                .populate("parent", "title slug")
                .populate("author", "name email");

            await logAction({
                userId: session.userId,
                username: session.username,
                action: "CREATE_PAGE",
                category: "CONTENT",
                target: `page:${page._id}`,
                detail: `Created page "${body.title || "untitled"}"`,
            });

            return NextResponse.json(
                { success: true, data: populatedPage },
                { status: 201 }
            );
        } catch (error: any) {
            console.error("POST /api/content/page error:", error);

            // Duplicate key (slug)
            if (error.code === 11000) {
                const field = Object.keys(error.keyPattern || {})[0];

                return NextResponse.json(
                    {
                        success: false,
                        code: "DUPLICATE_KEY",
                        message: `${field} sudah digunakan`,
                        fields: {
                            [field]: "Nilai ini sudah ada"
                        }
                    },
                    { status: 409 }
                );
            }

            // Validation error mongoose
            if (error.name === "ValidationError") {
                const fields: Record<string, string> = {};
                for (const key in error.errors) {
                    fields[key] = error.errors[key].message;
                }

                return NextResponse.json(
                    {
                        success: false,
                        code: "VALIDATION_ERROR",
                        message: "Input tidak valid",
                        fields
                    },
                    { status: 400 }
                );
            }

            await logError(req, "CREATE_PAGE", "content:pages", error, "CONTENT");

            return NextResponse.json(
                {
                    success: false,
                    code: "SERVER_ERROR",
                    message: "Terjadi kesalahan pada server"
                },
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
            return NextResponse.json({ success: false }, { status: 401 });
        }

        await connectDB();

        const body = await req.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, message: "Page ID is required" },
                { status: 400 }
            );
        }

        // 🔧 CLEANUP (NOT published — preserve for scheduling)
        delete updateData.author;
        delete updateData.created;

        if (updateData.parent === "") {
            updateData.parent = null;
        }

        const now = new Date().toISOString();
        const userId = session.userId;

        updateData.updated = { at: now, by: userId };

        if (updateData.status === "published" && (!updateData.published || !updateData.published.at)) {
            updateData.published = { at: now, by: userId };
        } else if (updateData.published && updateData.published.at && !updateData.published.by) {
            updateData.published.by = userId;
        }

        // Regenerate social-share image variants when the featured image changes
        const prev = await Page.findById(id).lean();
        const newImg = updateData.featuredImage?.url;
        const prevImg = prev?.featuredImage?.url;
        if (newImg && newImg !== prevImg && newImg.startsWith("/uploads/")) {
            try {
                const base = (await getSetting("app_url") || "http://localhost:3000").replace(/\/$/, "");
                const abs = base + newImg;
                const buf = Buffer.from(await (await fetch(abs, { cache: "no-store" })).arrayBuffer());
                const nowDt = new Date();
                const y = nowDt.getFullYear().toString();
                const m = String(nowDt.getMonth() + 1).padStart(2, "0");
                const dir = join(process.cwd(), "public", "uploads", y, m);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                const ts = Date.now();
                const fbName = `og-${ts}.png`;
                const twName = `tw-${ts}.png`;
                await writeFile(join(dir, fbName), await sharp(buf).resize(1200, 630, { fit: "cover", position: "centre" }).png().toBuffer());
                await writeFile(join(dir, twName), await sharp(buf).resize(1200, 600, { fit: "cover", position: "centre" }).png().toBuffer());
                updateData.featuredImage = {
                    ...(updateData.featuredImage || {}),
                    social: {
                        ...(prev?.featuredImage?.social || {}),
                        og: `/uploads/${y}/${m}/${fbName}`,
                        twitter: `/uploads/${y}/${m}/${twName}`,
                    },
                };
            } catch (e) {
                console.warn("⚠️ Social image variant generation failed:", (e as Error)?.message);
            }
        }

        const page = await Page.findByIdAndUpdate(
            id,
            updateData,
            {
                returnDocument: 'after',
                runValidators: true,
            }
        )
            .populate("parent", "title slug")
            .populate("author", "name email")
            .populate("created.by", "name email")
            .populate("updated.by", "name email")
            .populate("published.by", "name email");

        if (!page) {
            return NextResponse.json(
                { success: false, message: "Page not found" },
                { status: 404 }
            );
        }

        await logAction({
            userId: session.userId,
            username: session.username,
            action: "EDIT_PAGE",
            category: "CONTENT",
            target: `page:${id}`,
            detail: `Updated page ${id}`,
        });

        return NextResponse.json({ success: true, data: page });
    } catch (err) {
        console.error("PUT /api/content/page error:", err);
        await logError(req, "EDIT_PAGE", "content:pages", err, "CONTENT");
        return NextResponse.json(
            { success: false, message: "Failed to update page" },
            { status: 500 }
        );
    }
}

/* =========================
   DELETE (SOFT)
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
                { success: false, message: "Page ID is required" },
                { status: 400 }
            );
        }

        const page = await Page.findByIdAndUpdate(
            id,
            {
                isActive: false,
                updated: {
                    at: new Date().toISOString(),
                    by: session.userId,
                },
            },
            { returnDocument: 'after' }
        );

        if (!page) {
            return NextResponse.json(
                { success: false, message: "Page not found" },
                { status: 404 }
            );
        }

        await logAction({
            userId: session.userId,
            username: session.username,
            action: "DELETE_PAGE",
            category: "CONTENT",
            target: `page:${id}`,
            detail: `Deleted page ${id}`,
            level: "WARN",
        });

        return NextResponse.json({
            success: true,
            message: "Page deleted successfully",
        });
    } catch (error) {
        console.error("DELETE /api/content/page error:", error);
        await logError(req, "DELETE_PAGE", "content:pages", error, "CONTENT");
        return NextResponse.json(
            { success: false, message: "Failed to delete page" },
            { status: 500 }
        );
    }
}