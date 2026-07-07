import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { verifyApiKey } from "@/lib/api-auth";
import type { Account } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    const session = await verifyApiKey(request);
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const coa = searchParams.get("coa");
    const all = searchParams.get("all");

    const db = await getDb();
    const collection = db.collection<Account>("accountingAccounts");

    if (id) {
      const doc = await collection.findOne({ _id: new ObjectId(id) });
      return Response.json(doc);
    }

    const filter: Record<string, unknown> = {};
    if (!all) filter.isActive = true;
    if (coa) filter.coa = new ObjectId(coa);

    const docs = await collection.find(filter).sort({ number: 1 }).toArray();
    return Response.json(docs);
  } catch (error) {
    console.error("v1 Account GET error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
