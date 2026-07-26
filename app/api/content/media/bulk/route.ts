import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { logAction, logError } from "@/lib/log";
import connectDB from "@/lib/db";
import Media from "@/models/content/Media";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { action, ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
    }

    await connectDB();

    if (action === "delete") {
      const now = new Date().toISOString();
      await Media.updateMany(
        { _id: { $in: ids } },
        { $set: { deleted: { at: now, by: session.userId } } }
      );
      await logAction({ userId: session.userId, username: session.username, action: "BULK_DELETE_MEDIA", category: "CONTENT", target: `media:${ids.length}`, detail: `Soft-deleted ${ids.length} media` });
      return NextResponse.json({ success: true, count: ids.length });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    await logError(req, "BULK_MEDIA", "content:media", error, "CONTENT");
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
