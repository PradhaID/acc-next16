import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { verifyApiKey } from "@/lib/api-auth";
import type { ChartOfAccount } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    const session = await verifyApiKey(request);
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

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
    console.error("v1 COA GET error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
