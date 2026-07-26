import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { logAction, logError } from "@/lib/log";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

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

    const db = await getDb();
    const objectIds = ids.map((id: string) => new ObjectId(id));

    if (action === "delete") {
      await db.collection("systemUsers").updateMany(
        { _id: { $in: objectIds } },
        { $set: { isActive: false } }
      );
      await logAction({ userId: session.userId, username: session.username, action: "BULK_DELETE_USER", category: "USER", target: `users:${ids.length}`, detail: `Soft-deleted ${ids.length} users` });
      return NextResponse.json({ success: true, count: ids.length });
    }

    if (action === "status") {
      if (value === undefined) return NextResponse.json({ error: "isActive value required" }, { status: 400 });
      await db.collection("systemUsers").updateMany(
        { _id: { $in: objectIds } },
        { $set: { isActive: value === "true" } }
      );
      await logAction({ userId: session.userId, username: session.username, action: "BULK_STATUS_USER", category: "USER", target: `users:${ids.length}`, detail: `Set ${ids.length} users isActive=${value}` });
      return NextResponse.json({ success: true, count: ids.length });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    await logError(req, "BULK_USER", "system:users", error, "USER");
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
