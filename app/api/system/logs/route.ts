import { NextRequest } from "next/server";
import { getDb } from "@/lib/mongodb";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const level = searchParams.get("level") || "";
    const category = searchParams.get("category") || "";
    const user = searchParams.get("user") || "";
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";
    const exportCsv = searchParams.get("export") === "csv";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const db = await getDb();
    const filter: Record<string, unknown> = {};

    if (search) {
      filter.$or = [
        { action: { $regex: search, $options: "i" } },
        { detail: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
        { target: { $regex: search, $options: "i" } },
      ];
    }

    if (level) {
      filter.level = level.toUpperCase();
    }

    if (category) {
      filter.category = category.toUpperCase();
    }

    if (user) {
      filter.username = { $regex: user, $options: "i" };
    }

    if (from || to) {
      filter["created.at"] = {};
      if (from) (filter["created.at"] as Record<string, Date>).$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        (filter["created.at"] as Record<string, Date>).$lte = toDate;
      }
    }

    if (exportCsv) {
      const allLogs = await db
        .collection("systemLogs")
        .find(filter)
        .sort({ "created.at": -1 })
        .limit(5000)
        .toArray();

      const csvHeader = "Time,Level,Category,Action,User,Target,Detail,IP";
      const csvRows = allLogs.map((log: any) => {
        const time = log.created?.at ? new Date(log.created.at).toISOString() : "";
        const escape = (s: string) => `"${(s || "").replace(/"/g, '""')}"`;
        return [
          time,
          log.level || "INFO",
          log.category || "SYSTEM",
          escape(log.action || ""),
          escape(log.username || ""),
          escape(log.target || "-"),
          escape(log.detail || "-"),
          escape(log.ip || "-"),
        ].join(",");
      });

      return new Response([csvHeader, ...csvRows].join("\n"), {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    const total = await db.collection("systemLogs").countDocuments(filter);

    const logs = await db
      .collection("systemLogs")
      .find(filter)
      .sort({ "created.at": -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    const categoryStats = await db
      .collection("systemLogs")
      .aggregate([
        { $match: filter },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray();

    const levelStats = await db
      .collection("systemLogs")
      .aggregate([
        { $match: filter },
        { $group: { _id: "$level", count: { $sum: 1 } } },
      ])
      .toArray();

    const formatted = logs.map((log: any) => ({
      _id: log._id,
      time: log.created?.at,
      level: log.level || "INFO",
      category: log.category || "SYSTEM",
      action: log.action,
      target: log.target || "-",
      username: log.username,
      detail: log.detail || "-",
      oldValue: log.oldValue || null,
      newValue: log.newValue || null,
      ip: log.ip || "-",
    }));

    return Response.json({
      data: formatted,
      stats: {
        total,
        byCategory: Object.fromEntries(categoryStats.map((s: any) => [s._id || "SYSTEM", s.count])),
        byLevel: Object.fromEntries(levelStats.map((s: any) => [s._id || "INFO", s.count])),
      },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return Response.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
