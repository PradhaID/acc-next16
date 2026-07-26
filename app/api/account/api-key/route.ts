import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { logAction, logError } from "@/lib/log";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const db = await getDb();
    const users = db.collection("systemUsers");

    const apiKey = `ak_${crypto.randomBytes(32).toString("hex")}`;

    await users.updateOne(
      { _id: new ObjectId(session.userId) },
      {
        $set: {
          apiKey,
          updated: { at: new Date(), by: new ObjectId(session.userId) },
        },
      }
    );

    await logAction({
      userId: session.userId,
      username: session.username,
      action: "GENERATE_API_KEY",
      category: "API_KEY",
      target: `user:${session.username}`,
      detail: "API key regenerated",
    });

    return Response.json({ apiKey });
  } catch (error) {
    console.error("API key generate error:", error);
    await logError(request, "GENERATE_API_KEY", `user:${request.cookies.get(COOKIE_NAME)?.value || "unknown"}`, error, "API_KEY");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
