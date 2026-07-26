import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { logAction, logError } from "@/lib/log";
import connectDB from "@/lib/db";
import Category from "@/models/content/Category";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { action, ids, value } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
    }

    await connectDB();

    if (action === "delete") {
      const now = new Date().toISOString();
      await Category.updateMany(
        { _id: { $in: ids } },
        { $set: { isActive: false, updated: { at: now, by: session.userId } } }
      );
      await logAction({ userId: session.userId, username: session.username, action: "BULK_DELETE_CATEGORY", category: "CONTENT", target: `categories:${ids.length}`, detail: `Soft-deleted ${ids.length} categories` });
      return NextResponse.json({ success: true, count: ids.length });
    }

    if (action === "status") {
      if (value === undefined) return NextResponse.json({ error: "isActive value required" }, { status: 400 });
      const now = new Date().toISOString();
      await Category.updateMany(
        { _id: { $in: ids } },
        { $set: { isActive: value === "true", updated: { at: now, by: session.userId } } }
      );
      await logAction({ userId: session.userId, username: session.username, action: "BULK_STATUS_CATEGORY", category: "CONTENT", target: `categories:${ids.length}`, detail: `Set ${ids.length} categories isActive=${value}` });
      return NextResponse.json({ success: true, count: ids.length });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    await logError(req, "BULK_CATEGORY", "content:categories", error, "CONTENT");
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
