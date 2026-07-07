import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import type { SystemRole } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const db = await getDb();
    const roles = db.collection<SystemRole>("systemRoles");

    const docs = await roles.find().sort({ name: 1 }).toArray();
    return Response.json(docs);
  } catch (error) {
    console.error("Roles GET error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
