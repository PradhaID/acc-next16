import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import type { SystemGroup, SystemRole } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const withRoles = searchParams.get("withRoles");

    const db = await getDb();
    const groups = db.collection<SystemGroup>("systemGroups");

    if (id) {
      const group = await groups.findOne({ _id: new ObjectId(id) });
      if (!group) return Response.json({ error: "Not found." }, { status: 404 });

      if (withRoles === "true") {
        const joins = await db.collection("systemGroupHasRole").find({ groupId: group._id }).toArray();
        const roleIds = joins.map((j) => j.roleId);
        const roles: SystemRole[] = roleIds.length > 0
          ? await db.collection<SystemRole>("systemRoles").find({ _id: { $in: roleIds } }).sort({ name: 1 }).toArray()
          : [];
        return Response.json({ ...group, roles });
      }

      return Response.json(group);
    }

    const docs = await groups.find().sort({ name: 1 }).toArray();
    return Response.json(docs);
  } catch (error) {
    console.error("Groups GET error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { name, description, isActive } = body;

    if (!name) return Response.json({ error: "Name is required." }, { status: 400 });

    const db = await getDb();
    const groups = db.collection<SystemGroup>("systemGroups");

    const existing = await groups.findOne({ name });
    if (existing) return Response.json({ error: "Group name already exists." }, { status: 409 });

    const now = new Date();
    const userId = new ObjectId(session.userId);

    const doc: SystemGroup = {
      _id: new ObjectId(),
      name,
      description,
      isActive: isActive !== undefined ? isActive : true,
      created: { at: now, by: userId },
      updated: { at: now, by: userId },
    };

    await groups.insertOne(doc);
    return Response.json(doc, { status: 201 });
  } catch (error) {
    console.error("Groups POST error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { _id, name, description, roleIds, isActive } = body;

    if (!_id) return Response.json({ error: "ID is required." }, { status: 400 });

    const db = await getDb();
    const groups = db.collection<SystemGroup>("systemGroups");
    const now = new Date();
    const userId = new ObjectId(session.userId);

    const setData: Record<string, unknown> = {
      updated: { at: now, by: userId },
    };
    if (name) setData.name = name;
    if (description !== undefined) setData.description = description;
    if (isActive !== undefined) setData.isActive = isActive;

    const result = await groups.updateOne(
      { _id: new ObjectId(_id) },
      { $set: setData }
    );

    if (result.matchedCount === 0) {
      return Response.json({ error: "Not found." }, { status: 404 });
    }

    // If roleIds provided, replace all role assignments for this group
    if (roleIds && Array.isArray(roleIds)) {
      const groupHasRole = db.collection("systemGroupHasRole");
      await groupHasRole.deleteMany({ groupId: new ObjectId(_id) });

      if (roleIds.length > 0) {
        const docs = roleIds.map((roleId: string) => ({
          _id: new ObjectId(),
          groupId: new ObjectId(_id),
          roleId: new ObjectId(roleId),
          created: { at: now, by: userId },
        }));
        await groupHasRole.insertMany(docs);
      }
    }

    return Response.json({ message: "Updated." });
  } catch (error) {
    console.error("Groups PUT error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return Response.json({ error: "ID is required." }, { status: 400 });

    const db = await getDb();
    await db.collection<SystemGroup>("systemGroups").deleteOne({ _id: new ObjectId(id) });
    await db.collection("systemGroupHasRole").deleteMany({ groupId: new ObjectId(id) });

    return Response.json({ message: "Deleted." });
  } catch (error) {
    console.error("Groups DELETE error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
