import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Post from "@/models/content/Post";
import Page from "@/models/content/Page";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get("path"); // Contoh: /uploads/2024/05/image.jpg

    if (!filePath) return NextResponse.json({ success: false }, { status: 400 });

    await connectDB();

    // 1. Cek di Featured Image
    const postsWithFeatured = await Post.find({ "featuredImage.url": filePath }, "title");
    const pagesWithFeatured = await Page.find({ "featuredImage.url": filePath }, "title");

    // 2. Cek di dalam konten (HTML string)
    // Menggunakan regex untuk mencari path di dalam tag <img src="...">
    const postsWithContent = await Post.find({ content: { $regex: filePath } }, "title");
    const pagesWithContent = await Page.find({ content: { $regex: filePath } }, "title");

    const totalUsage = postsWithFeatured.length + pagesWithFeatured.length + postsWithContent.length + pagesWithContent.length;

    return NextResponse.json({
        success: true,
        usage: {
            total: totalUsage,
            details: [
                ...postsWithFeatured.map(p => ({ type: 'Post (Cover)', title: p.title })),
                ...pagesWithFeatured.map(p => ({ type: 'Page (Cover)', title: p.title })),
                ...postsWithContent.map(p => ({ type: 'Post (Content)', title: p.title })),
                ...pagesWithContent.map(p => ({ type: 'Page (Content)', title: p.title })),
            ]
        }
    });
}