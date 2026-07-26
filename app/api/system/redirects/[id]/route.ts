import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { logAction, logError } from "@/lib/log";

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { _id, from, to, type, isPattern, isActive } = body;

    if (!_id) return Response.json({ error: "ID is required." }, { status: 400 });

    const db = await getDb();
    const collection = db.collection("systemRedirects");
    const now = new Date();
    const userId = new ObjectId(session.userId);

    const setData: Record<string, unknown> = {
      updated: { at: now, by: userId },
    };
    if (from) setData.from = from;
    if (to) setData.to = to;
    if (type) setData.type = type;
    if (isPattern !== undefined) setData.isPattern = isPattern;
    if (isActive !== undefined) setData.isActive = isActive;

    const result = await collection.updateOne(
      { _id: new ObjectId(_id) },
      { $set: setData }
    );

    if (result.matchedCount === 0) {
      return Response.json({ error: "Not found." }, { status: 404 });
    }

    await logAction({
      userId: session.userId,
      username: session.username,
      action: "EDIT_REDIRECT",
      category: "REDIRECT",
      target: `redirect:${_id}`,
      detail: `Updated redirect ${_id}`,
    });

    return Response.json({ message: "Updated." });
  } catch (error) {
    console.error("Redirects PUT error:", error);
    await logError(request, "EDIT_REDIRECT", "system:redirects", error, "REDIRECT");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    if (!id) return Response.json({ error: "ID is required." }, { status: 400 });

    const db = await getDb();
    await db.collection("systemRedirects").deleteOne({ _id: new ObjectId(id) });

    await logAction({
      userId: session.userId,
      username: session.username,
      action: "DELETE_REDIRECT",
      category: "REDIRECT",
      target: `redirect:${id}`,
      detail: `Deleted redirect ${id}`,
      level: "WARN",
    });

    return Response.json({ message: "Deleted." });
  } catch (error) {
    console.error("Redirects DELETE error:", error);
    await logError(request, "DELETE_REDIRECT", "system:redirects", error, "REDIRECT");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
