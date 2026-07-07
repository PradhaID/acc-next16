import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import type { SystemUser } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const db = await getDb();
    const users = db.collection<SystemUser>("systemUsers");
    const user = await users.findOne({ _id: new ObjectId(session.userId) });

    if (!user) return Response.json({ error: "Not found" }, { status: 404 });

    let groupName: string | null = null;
    if (user.groupId) {
      const group = await db.collection("systemGroups").findOne({ _id: user.groupId });
      groupName = group?.name || null;
    }

    let createdByName: string | null = null;
    if (user.created?.by) {
      const creator = await db.collection("systemUsers").findOne(
        { _id: new ObjectId(user.created.by) },
        { projection: { fullName: 1 } }
      );
      createdByName = creator?.fullName || null;
    }

    let updatedByName: string | null = null;
    if (user.updated?.by) {
      const updater = await db.collection("systemUsers").findOne(
        { _id: new ObjectId(user.updated.by) },
        { projection: { fullName: 1 } }
      );
      updatedByName = updater?.fullName || null;
    }

    const { password, ...rest } = user;
    return Response.json({ ...rest, groupName, createdByName, updatedByName, roleIds: session.roleIds || [] });
  } catch (error) {
    console.error("Auth me GET error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
