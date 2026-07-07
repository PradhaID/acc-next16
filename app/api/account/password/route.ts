import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import bcrypt from "bcryptjs";
import type { SystemUser } from "@/lib/models";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return Response.json({ error: "Current password and new password are required." }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return Response.json({ error: "New password must be at least 6 characters." }, { status: 400 });
    }

    const db = await getDb();
    const users = db.collection<SystemUser>("systemUsers");

    const user = await users.findOne({ _id: new ObjectId(session.userId) });
    if (!user) return Response.json({ error: "User not found." }, { status: 404 });

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return Response.json({ error: "Current password is incorrect." }, { status: 401 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          password: hashedPassword,
          updated: { at: new Date(), by: new ObjectId(session.userId) },
        },
      }
    );

    return Response.json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Password POST error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
