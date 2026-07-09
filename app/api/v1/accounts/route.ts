import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { verifyApiKey } from "@/lib/api-auth";
import { buildFilter } from "@/lib/filter";
import { errors } from "@/lib/api-error";
import type { Account } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    const session = await verifyApiKey(request);
    if (!session) return errors.unauthorized();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    const db = await getDb();
    const collection = db.collection<Account>("accountingAccounts");

    if (id) {
      const doc = await collection.findOne({ _id: new ObjectId(id) });
      if (!doc) return errors.notFound("Account not found");
      return Response.json(doc);
    }

    const filter = buildFilter(searchParams, {
      number: { type: "numberExact" },
      coa: { type: "objectId" },
      all: { type: "boolean", field: "all", default: false },
    });

    if (!filter.isActive && filter.all !== true) filter.isActive = true;
    delete filter.all;

    const docs = await collection.find(filter).sort({ number: 1 }).toArray();
    return Response.json(docs);
  } catch (error) {
    console.error("v1 Account GET error:", error);
    return errors.internal();
  }
}
