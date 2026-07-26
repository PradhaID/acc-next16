import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { logAction, logError } from "@/lib/log";
import connectDB from "@/lib/db";
import Ads from "@/models/content/Ads";

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
      await Ads.deleteMany({ _id: { $in: ids } });
      await logAction({ userId: session.userId, username: session.username, action: "BULK_DELETE_AD", category: "AD", target: `ads:${ids.length}`, detail: `Deleted ${ids.length} ads` });
      return NextResponse.json({ success: true, count: ids.length });
    }

    if (action === "status") {
      if (value === undefined) return NextResponse.json({ error: "isActive value required" }, { status: 400 });
      await Ads.updateMany(
        { _id: { $in: ids } },
        { $set: { isActive: value === "true" } }
      );
      await logAction({ userId: session.userId, username: session.username, action: "BULK_STATUS_AD", category: "AD", target: `ads:${ids.length}`, detail: `Set ${ids.length} ads isActive=${value}` });
      return NextResponse.json({ success: true, count: ids.length });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    await logError(req, "BULK_AD", "content:ads", error, "AD");
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
