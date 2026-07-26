import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { logAction, logError } from "@/lib/log";
import { generateAutoArticle } from "@/lib/automation/articleGenerator";

// Allow up to 120s for article generation on this route
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
        const { query, generateImage } = body;

        if (!query || typeof query !== "string" || query.trim().length < 3) {
            return NextResponse.json({ success: false, message: "Query terlalu pendek. Minimal 3 karakter." }, { status: 400 });
        }

        const searchQuery = query.trim();
        console.log(`🚀 [Generate] Memulai: ${searchQuery}`);

        await generateAutoArticle(searchQuery, session.userId, generateImage !== false);

        await logAction({
            userId: session.userId,
            username: session.username,
            action: "GENERATE_POST",
            category: "CONTENT",
            target: `post:ai`,
            detail: `AI generated article: "${searchQuery}"`,
        });

        console.log(`✅ [Generate] Done: ${searchQuery}`);
        return NextResponse.json({
            success: true,
            message: `Article "${searchQuery}" created and saved as draft!`,
        });

    } catch (error: any) {
        console.error("❌ [Generate] Error:", error);
        await logError(req, "GENERATE_POST", "content:posts:ai", error, "CONTENT");
        return NextResponse.json({ success: false, message: error.message || "Gagal membuat artikel." }, { status: 500 });
    }
}
