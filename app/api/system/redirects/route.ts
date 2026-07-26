import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { logAction, logError } from "@/lib/log";
import type { RedirectRule } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const db = await getDb();
    const collection = db.collection<RedirectRule>("systemRedirects");

    const filter: Record<string, unknown> = {};
    if (type === "log") {
      // Fetch active redirect "from" patterns so we can hide already-handled 404s
      const activeRedirects = await collection
        .find({ isActive: true })
        .project({ from: 1, isPattern: 1 })
        .toArray();
      const redirectFroms = new Set(activeRedirects.map((r) => r.from));
      const patterns = activeRedirects
        .filter((r) => r.isPattern)
        .map((r) => {
          try { return new RegExp(r.from); } catch { return null; }
        })
        .filter(Boolean) as RegExp[];

      const logs = await db
        .collection("systemRedirectLogs")
        .find()
        .sort({ "created.at": -1 })
        .limit(200)
        .toArray();

      // Auto-hide 404s that already have an active redirect rule
      const filtered = logs.filter((log: any) => {
        if (redirectFroms.has(log.url)) return false;
        for (const re of patterns) {
          if (re.test(log.url)) return false;
        }
        return true;
      });

      return Response.json(filtered);
    }

    const docs = await collection.find(filter).sort({ "created.at": -1 }).toArray();
    return Response.json(docs);
  } catch (error) {
    console.error("Redirects GET error:", error);
    await logError(request, "LIST_REDIRECT", "system:redirects", error, "REDIRECT");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { from, to, type, isPattern, isActive } = body;

    if (!from || !to) {
      return Response.json({ error: "From and To are required." }, { status: 400 });
    }

    const db = await getDb();
    const collection = db.collection<RedirectRule>("systemRedirects");

    const existing = await collection.findOne({ from });
    if (existing) {
      return Response.json({ error: "A redirect for this URL already exists." }, { status: 409 });
    }

    const now = new Date();
    const userId = new ObjectId(session.userId);

    const doc: RedirectRule = {
      _id: new ObjectId(),
      from,
      to,
      type: type || "301",
      isPattern: isPattern || false,
      isActive: isActive !== undefined ? isActive : true,
      hitCount: 0,
      created: { at: now, by: userId },
      updated: { at: now, by: userId },
    };

    await collection.insertOne(doc);

    await logAction({
      userId: session.userId,
      username: session.username,
      action: "CREATE_REDIRECT",
      category: "REDIRECT",
      target: `redirect:${from}`,
      detail: `Created redirect ${from} → ${to} (${doc.type})`,
    });

    return Response.json(doc, { status: 201 });
  } catch (error) {
    console.error("Redirects POST error:", error);
    await logError(request, "CREATE_REDIRECT", "system:redirects", error, "REDIRECT");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");

    if (type === "log" && id) {
      const db = await getDb();
      const result = await db.collection("systemRedirectLogs").deleteOne({ _id: new ObjectId(id) });
      if (result.deletedCount === 0) {
        return Response.json({ error: "Log entry not found" }, { status: 404 });
      }
      await logAction({
        userId: session.userId,
        username: session.username,
        action: "DELETE_404_LOG",
        category: "REDIRECT",
        target: `log:${id}`,
        detail: `Deleted 404 log entry`,
      });
      return Response.json({ success: true });
    }

    return Response.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    console.error("Redirects DELETE error:", error);
    await logError(request, "DELETE_REDIRECT_LOG", "system:redirects", error, "REDIRECT");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
