import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { logAction, logError } from "@/lib/log";
import connectDB from "@/lib/db";
import Page from "@/models/content/Page";

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
      await Page.updateMany(
        { _id: { $in: ids } },
        { $set: { isActive: false, updated: { at: now, by: session.userId } } }
      );
      await logAction({ userId: session.userId, username: session.username, action: "BULK_DELETE_PAGE", category: "CONTENT", target: `pages:${ids.length}`, detail: `Soft-deleted ${ids.length} pages` });
      return NextResponse.json({ success: true, count: ids.length });
    }

    if (action === "status") {
      if (!value) return NextResponse.json({ error: "Status value required" }, { status: 400 });
      const now = new Date().toISOString();
      const update: any = { status: value, updated: { at: now, by: session.userId } };
      if (value === "published") update.published = { at: now, by: session.userId };
      await Page.updateMany({ _id: { $in: ids } }, { $set: update });
      await logAction({ userId: session.userId, username: session.username, action: "BULK_STATUS_PAGE", category: "CONTENT", target: `pages:${ids.length}`, detail: `Set ${ids.length} pages to ${value}` });
      return NextResponse.json({ success: true, count: ids.length });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    await logError(req, "BULK_PAGE", "content:pages", error, "CONTENT");
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
