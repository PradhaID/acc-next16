import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import bcrypt from "bcryptjs";
import type { SystemUser } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const groupId = searchParams.get("groupId");

    const db = await getDb();
    const users = db.collection<SystemUser>("systemUsers");

    if (id) {
      const user = await users.findOne({ _id: new ObjectId(id) });
      if (user) {
        const { password, ...rest } = user;
        return Response.json(rest);
      }
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const filter: Record<string, unknown> = {};
    if (groupId) filter.groupId = new ObjectId(groupId);

    const docs = await users
      .find(filter, { projection: { password: 0 } })
      .sort({ username: 1 })
      .toArray();

    return Response.json(docs);
  } catch (error) {
    console.error("Users GET error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { username, fullName, email, password, groupId, timezone, biography } = body;

    if (!username || !fullName || !email || !password) {
      return Response.json({ error: "Username, full name, email, and password are required." }, { status: 400 });
    }

    const db = await getDb();
    const users = db.collection<SystemUser>("systemUsers");

    const existing = await users.findOne({
      $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }],
    });
    if (existing) {
      return Response.json({ error: "Username or email already exists." }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const now = new Date();
    const userId = new ObjectId();
    const adminId = new ObjectId(session.userId);

    await users.insertOne({
      _id: userId,
      username: username.toLowerCase(),
      fullName: fullName.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      emailVerified: true,
      groupId: groupId ? new ObjectId(groupId) : null,
      timezone: timezone || "Asia/Jakarta",
      biography: biography || "",
      isActive: true,
      created: { at: now, by: adminId },
      updated: { at: now, by: adminId },
    });

    const createdUser = await users.findOne({ _id: userId }, { projection: { password: 0 } });
    return Response.json(createdUser, { status: 201 });
  } catch (error) {
    console.error("Users POST error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { _id, ...updateFields } = body;

    if (!_id) return Response.json({ error: "ID is required." }, { status: 400 });

    const db = await getDb();
    const users = db.collection<SystemUser>("systemUsers");

    const setData: Record<string, unknown> = {
      updated: { at: new Date(), by: new ObjectId(session.userId) },
    };

    if (updateFields.fullName) setData.fullName = updateFields.fullName.trim();
    if (updateFields.email) setData.email = updateFields.email.toLowerCase();
    if (updateFields.groupId !== undefined) setData.groupId = updateFields.groupId ? new ObjectId(updateFields.groupId) : null;
    if (updateFields.timezone !== undefined) setData.timezone = updateFields.timezone;
    if (updateFields.biography !== undefined) setData.biography = updateFields.biography;
    if (updateFields.isActive !== undefined) setData.isActive = updateFields.isActive;
    if (updateFields.password) setData.password = await bcrypt.hash(updateFields.password, 12);

    const result = await users.updateOne(
      { _id: new ObjectId(_id) },
      { $set: setData }
    );

    if (result.matchedCount === 0) {
      return Response.json({ error: "Not found." }, { status: 404 });
    }

    return Response.json({ message: "Updated." });
  } catch (error) {
    console.error("Users PUT error:", error);
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
    await db.collection<SystemUser>("systemUsers").deleteOne({ _id: new ObjectId(id) });

    return Response.json({ message: "Deleted." });
  } catch (error) {
    console.error("Users DELETE error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
