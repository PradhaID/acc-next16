import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import PageView from "@/models/analytics/PageView";

export async function POST(req: Request) {
    try {
        const { url, path, referrer, sessionId } = await req.json();

        if (!url || !path || !sessionId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await connectDB();

        const userAgent = req.headers.get("user-agent") || null;

        await PageView.create({
            url,
            path,
            referrer: referrer || null,
            userAgent,
            sessionId,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Analytics track error:", error);
        return NextResponse.json({ error: "Failed to track" }, { status: 500 });
    }
}
