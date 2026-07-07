import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { recalculateBalance } from "@/lib/accounting/balance";
import type { Account } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    console.error("Account GET error:", error);
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
    const { coa, number, name, description } = body;

    if (!coa || !number || !name) {
      return Response.json({ error: "COA, number, and name are required." }, { status: 400 });
    }

    const db = await getDb();
    const collection = db.collection<Account>("accountingAccounts");

    const existing = await collection.findOne({ number });
    if (existing) {
      return Response.json({ error: "Account number already exists." }, { status: 409 });
    }

    const doc: Account = {
      _id: new ObjectId(),
      coa: new ObjectId(coa),
      number,
      name,
      description,
      balance: 0,
      isActive: true,
      created: { at: new Date(), by: new ObjectId(session.userId) },
      updated: { at: new Date(), by: new ObjectId(session.userId) },
    };

    await collection.insertOne(doc);
    return Response.json(doc, { status: 201 });
  } catch (error) {
    console.error("Account POST error:", error);
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
    const collection = db.collection<Account>("accountingAccounts");

    delete (updateFields as Record<string, unknown>).created;
    delete (updateFields as Record<string, unknown>).balance;
    delete (updateFields as Record<string, unknown>).number;
    delete (updateFields as Record<string, unknown>).coa;

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
    console.error("Account PUT error:", error);
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
    const hard = searchParams.get("hard");

    if (!id) {
      return Response.json({ error: "ID is required." }, { status: 400 });
    }

    const db = await getDb();
    const accounts = db.collection<Account>("accountingAccounts");
    const details = db.collection("accountingTransactionDetails");

    if (hard === "true") {
      const hasTxn = await details.findOne({ account: new ObjectId(id) });
      if (hasTxn) {
        return Response.json(
          { error: "Cannot hard-delete account with transaction history." },
          { status: 400 }
        );
      }
      await accounts.deleteOne({ _id: new ObjectId(id) });
      return Response.json({ message: "Deleted permanently." });
    }

    await accounts.updateOne(
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
    console.error("Account DELETE error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "reactivate") {
      const body = await request.json();
      const db = await getDb();
      const accounts = db.collection<Account>("accountingAccounts");

      await accounts.updateOne(
        { _id: new ObjectId(body._id) },
        {
          $set: {
            isActive: true,
            updated: { at: new Date(), by: new ObjectId(session.userId) },
          },
        }
      );

      return Response.json({ message: "Reactivated." });
    }

    if (action === "recalculate") {
      const body = await request.json();
      await recalculateBalance(new ObjectId(body._id));
      return Response.json({ message: "Balance recalculated." });
    }

    return Response.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    console.error("Account PATCH error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
