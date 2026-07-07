import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import type { ChartOfAccount } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const search = searchParams.get("search");
    const active = searchParams.get("active");
    const all = searchParams.get("all");

    const db = await getDb();
    const collection = db.collection<ChartOfAccount>("accountingCoa");

    if (id) {
      const doc = await collection.findOne({ _id: new ObjectId(id) });
      return Response.json(doc);
    }

    const filter: Record<string, unknown> = {};
    if (active === "true") filter.isActive = true;
    else if (active === "false") filter.isActive = false;
    else if (!all) filter.isActive = true;

    if (search) {
      const regex = { $regex: search, $options: "i" };
      filter.$or = [{ name: regex }, { code: isNaN(Number(search)) ? regex : Number(search) }];
    }

    const docs = await collection.find(filter).sort({ code: 1 }).toArray();
    return Response.json(docs);
  } catch (error) {
    console.error("COA GET error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { parent, code, name, description, category, position, isActive } = body;

    if (!code || !name || !category) {
      return Response.json({ error: "Code, name, and category are required." }, { status: 400 });
    }

    const db = await getDb();
    const collection = db.collection<ChartOfAccount>("accountingCoa");

    const codeStr = String(code).trim();
    const existing = await collection.findOne({
      $expr: { $eq: [{ $toString: "$code" }, codeStr] },
    });
    if (existing) {
      return Response.json({ error: "Code already exists." }, { status: 409 });
    }

    const categoryPositionMap: Record<string, "Db" | "Cr"> = {
      Asset: "Db",
      COGS: "Db",
      Expense: "Db",
      Liability: "Cr",
      Equity: "Cr",
      Revenue: "Cr",
    };

    const doc: ChartOfAccount = {
      _id: new ObjectId(),
      parent: parent ? new ObjectId(parent) : null,
      code: codeStr,
      name,
      description,
      position: position || categoryPositionMap[category] || "Db",
      category: category as ChartOfAccount["category"],
      isActive: isActive !== undefined ? isActive : true,
      created: { at: new Date(), by: new ObjectId(session.userId) },
      updated: { at: new Date(), by: new ObjectId(session.userId) },
    };

    await collection.insertOne(doc);
    return Response.json(doc, { status: 201 });
  } catch (error) {
    console.error("COA POST error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { _id, ...updateFields } = body;

    if (!_id) {
      return Response.json({ error: "ID is required." }, { status: 400 });
    }

    const db = await getDb();
    const collection = db.collection<ChartOfAccount>("accountingCoa");

    delete (updateFields as Record<string, unknown>).created;

    const result = await collection.updateOne(
      { _id: new ObjectId(_id) },
      {
        $set: {
          ...updateFields,
          updated: { at: new Date(), by: new ObjectId(session.userId) },
        },
      }
    );

    if (result.matchedCount === 0) {
      return Response.json({ error: "Not found." }, { status: 404 });
    }

    return Response.json({ message: "Updated." });
  } catch (error) {
    console.error("COA PUT error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json({ error: "ID is required." }, { status: 400 });
    }

    const db = await getDb();
    const collection = db.collection<ChartOfAccount>("accountingCoa");

    await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          isActive: false,
          updated: { at: new Date(), by: new ObjectId(session.userId) },
        },
      }
    );

    return Response.json({ message: "Deactivated." });
  } catch (error) {
    console.error("COA DELETE error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
