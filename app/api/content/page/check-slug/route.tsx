import connectDB from "@/lib/db";
import Page from "@/models/content/Page";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");
    const id = searchParams.get("id"); // Kirim ID jika sedang Edit mode

    await connectDB();

    // Cari page lain yang punya slug sama tapi ID berbeda
    const existingPage = await Page.findOne({
        slug,
        _id: { $ne: id },
        isActive: true
    });

    return NextResponse.json({ available: !existingPage });
}