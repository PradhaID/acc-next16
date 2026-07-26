import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { logAction, logError } from "@/lib/log";
import connectDB from "@/lib/db";
import Post from "@/models/content/Post";
import Category from "@/models/content/Category";
import { generateSocialImageForPost } from "@/lib/generate-social";

export async function GET(req: Request) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        const status = searchParams.get("status");
        const category = searchParams.get("category");
        const tag = searchParams.get("tag");
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const search = searchParams.get("search");
        const exclude = searchParams.get("exclude");

        // Get single post by ID
        if (id) {
            const post = await Post.findOne({ _id: id, isActive: true })
                .populate("categories", "name slug parent")
                .populate("author", "name email")
                .populate("created.by", "name email")
                .populate("updated.by", "name email")
                .populate("published.by", "name email");

            if (!post) {
                return NextResponse.json(
                    { success: false, message: "Post not found" },
                    { status: 404 }
                );
            }

            return NextResponse.json({ success: true, data: post });
        }

        // Build query
        const query: any = { isActive: true };

        if (status && status !== "all") {
            query.status = status;
        }

        if (category && category !== "all") {
            query.categories = category;
        }

        if (tag) {
            query.tags = tag;
        }
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { slug: { $regex: search, $options: "i" } }
            ];
        }

        // Public request filtering
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAME)?.value;
        const session = token ? await verifyToken(token) : null;
        if (!session || status === 'published') {
            query.status = 'published';
            query.isActive = true;
            query['published.at'] = { $lte: new Date() };
        }

        // Exclude current post for related posts
        if (exclude) {
            query.slug = { $ne: exclude };
        }

        // Get posts with pagination
        const posts = await Post.find(query)
            .populate("categories", "name slug parent")
            .populate("author", "name email")
            .sort({ "created.at": -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await Post.countDocuments(query);
        const baseQuery = { isActive: true };
        const totalGlobal = await Post.countDocuments(baseQuery);
        const publishedCount = await Post.countDocuments({ ...baseQuery, status: 'published' });
        const draftCount = await Post.countDocuments({ ...baseQuery, status: 'draft' });
        const archivedCount = await Post.countDocuments({ ...baseQuery, status: 'archived' });

        return NextResponse.json({
            success: true,
            data: posts,
            total,
            stats: {
                total: totalGlobal,
                published: publishedCount,
                draft: draftCount,
                archived: archivedCount
            },
            page,
            limit,
        });
    } catch (error) {
        console.error("GET /api/content/post error:", error);
        await logError(req, "LIST_POST", "content:posts", error, "CONTENT");
        return NextResponse.json(
            { success: false, message: "Failed to fetch posts" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        // Check authentication
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

        // Remove client-side timestamps and user IDs - we'll set them server-side
        delete body.created;
        delete body.updated;
        delete body.author;

        const now = new Date().toISOString();
        const userId = session.userId;

        // Block creation if the slug is already taken (unique index also
        // enforces this, but return a clean error instead of a 500).
        if (body.slug) {
            const existing = await Post.findOne({ slug: body.slug, isActive: true }).lean();
            if (existing) {
                return NextResponse.json(
                    { success: false, message: `Slug "${body.slug}" is already in use. Please use a different title or slug.` },
                    { status: 409 }
                );
            }
        }

        // Handle published date if status is published
        let published = body.published || null;
        if (body.status === 'published' && (!published || !published.at)) {
            published = {
                at: now,
                by: userId
            };
        } else if (published && published.at && !published.by) {
            published.by = userId;
        }

        // Create post with server-side session data
        const post = await Post.create({
            ...body,
            author: userId,
            published,
            created: {
                at: now,
                by: userId,
            },
            updated: {
                at: now,
                by: userId,
            },
        });

        // Generate composite social-share image on create
        const socialPath = await generateSocialImageForPost({
            slug: post.slug,
            title: post.title,
            featuredImageUrl: post.featuredImage?.url,
        });
        if (socialPath) {
            await Post.findByIdAndUpdate(post._id, {
                "featuredImage.social.og": socialPath,
                "featuredImage.social.twitter": socialPath,
            });
        }

        // Populate references before returning
        const populatedPost = await Post.findById(post._id)
            .populate("categories", "name slug parent")
            .populate("author", "name email")
            .populate("created.by", "name email")
            .populate("updated.by", "name email");

        await logAction({
            userId: session.userId,
            username: session.username,
            action: "CREATE_POST",
            category: "CONTENT",
            target: `post:${post._id}`,
            detail: `Created post "${body.title || "untitled"}"`,
        });

        return NextResponse.json(
            { success: true, data: populatedPost },
            { status: 201 }
        );
    } catch (error) {
        console.error("POST /api/content/post error:", error);
        await logError(req, "CREATE_POST", "content:posts", error, "CONTENT");
        return NextResponse.json(
            { success: false, message: "Failed to create post" },
            { status: 500 }
        );
    }
}

export async function PUT(req: Request) {
    try {
        // Check authentication
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
                { success: false, message: "Post ID is required" },
                { status: 400 }
            );
        }

        const now = new Date().toISOString();
        const userId = session.userId;

        // Update timestamps
        updateData.updated = {
            at: now,
            by: userId,
        };

        // Handle published date if status is published
        if (updateData.status === "published") {
            if (!updateData.published || !updateData.published.at) {
                updateData.published = {
                    ...(updateData.published || {}),
                    at: now,
                    by: userId,
                };
            } else if (updateData.published && updateData.published.at && !updateData.published.by) {
                updateData.published.by = userId;
            }
        }

        const post = await Post.findByIdAndUpdate(id, updateData, {
            returnDocument: 'after',
        })
            .populate("categories", "name slug parent")
            .populate("author", "name email")
            .populate("created.by", "name email")
            .populate("updated.by", "name email")
            .populate("published.by", "name email");

        if (!post) {
            return NextResponse.json(
                { success: false, message: "Post not found" },
                { status: 404 }
            );
        }

        // Regenerate composite social-share image on update
        const socialPath = await generateSocialImageForPost({
            slug: post.slug,
            title: post.title,
            featuredImageUrl: post.featuredImage?.url,
        });
        if (socialPath) {
            await Post.findByIdAndUpdate(id, {
                "featuredImage.social.og": socialPath,
                "featuredImage.social.twitter": socialPath,
            });
        }

        await logAction({
            userId: session.userId,
            username: session.username,
            action: "EDIT_POST",
            category: "CONTENT",
            target: `post:${id}`,
            detail: `Updated post ${id}`,
        });

        return NextResponse.json({ success: true, data: post });
    } catch (error) {
        console.error("PUT /api/content/post error:", error);
        await logError(req, "EDIT_POST", "content:posts", error, "CONTENT");
        return NextResponse.json(
            { success: false, message: "Failed to update post" },
            { status: 500 }
        );
    }
}

export async function DELETE(req: Request) {
    try {
        // Check authentication
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
                { success: false, message: "Post ID is required" },
                { status: 400 }
            );
        }

        // Soft delete - set isActive to false
        const post = await Post.findByIdAndUpdate(
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

        if (!post) {
            return NextResponse.json(
                { success: false, message: "Post not found" },
                { status: 404 }
            );
        }

        await logAction({
            userId: session.userId,
            username: session.username,
            action: "DELETE_POST",
            category: "CONTENT",
            target: `post:${id}`,
            detail: `Deleted post ${id}`,
            level: "WARN",
        });

        return NextResponse.json({
            success: true,
            message: "Post deleted successfully",
        });
    } catch (error) {
        console.error("DELETE /api/content/post error:", error);
        await logError(req, "DELETE_POST", "content:posts", error, "CONTENT");
        return NextResponse.json(
            { success: false, message: "Failed to delete post" },
            { status: 500 }
        );
    }
}