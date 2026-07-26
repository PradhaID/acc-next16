import { getDb } from "@/lib/mongodb";
import type { SystemUser } from "@/lib/models";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier } = body;

    if (!identifier) {
      return Response.json({ error: "Identifier is required." }, { status: 400 });
    }

    const trimmed = identifier.trim().toLowerCase();
    const db = await getDb();
    const user = await db.collection<SystemUser>("systemUsers").findOne(
      { $or: [{ username: trimmed }, { email: trimmed }] },
      { projection: { email: 1 } }
    );

    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    return Response.json({ email: user.email });
  } catch {
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
