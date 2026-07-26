import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { logAction, logError } from "@/lib/log";
import { fixContentByAI } from "@/lib/automation/articleGenerator";

export const maxDuration = 120;

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAME)?.value;
        const session = token ? await verifyToken(token) : null;
        if (!session) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { postId, instruction } = body;

        if (!postId || typeof postId !== "string") {
            return NextResponse.json({ success: false, message: "Post ID is required." }, { status: 400 });
        }
        if (!instruction || typeof instruction !== "string" || instruction.trim().length < 3) {
            return NextResponse.json({ success: false, message: "Instruction must be at least 3 characters." }, { status: 400 });
        }

        console.log(`🔧 [FixByAI] Starting: post=${postId}`);
        const result = await fixContentByAI(postId, instruction.trim());

        await logAction({
            userId: session.userId,
            username: session.username,
            action: "FIX_BY_AI",
            category: "CONTENT",
            target: `post:${postId}`,
            detail: `AI fix suggestion: "${instruction.trim()}"`,
        });

        console.log(`✅ [FixByAI] Done: post=${postId}`);
        return NextResponse.json(result);

    } catch (error: any) {
        console.error("❌ [FixByAI] Error:", error);
        await logError(req, "POST", "content:posts:fix-by-ai", error, "CONTENT");
        return NextResponse.json({ success: false, message: error.message || "AI fix failed." }, { status: 500 });
    }
}
