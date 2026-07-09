import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { buildFilter } from "@/lib/filter";
import { errors } from "@/lib/api-error";
import { recalculateMultipleBalances } from "@/lib/accounting/balance";
import type { Transaction, TransactionDetail } from "@/lib/models";

function generateCode(type: string, effectiveDate?: string): string {
  const prefixMap: Record<string, string> = {
    General: "GJ",
    FundTransfer: "FT",
    Expense: "EX",
    Revenue: "RV",
    Purchase: "PC",
    Sales: "SL",
    Payroll: "PR",
    Tax: "TX",
    Depreciation: "DP",
    Closing: "CE",
  };
  const prefix = prefixMap[type] || "GJ";
  const d = effectiveDate ? new Date(effectiveDate) : new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 900) + 100);
  return `${prefix}-${y}${m}${day}-${rand}`;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const includeDetails = searchParams.get("includeDetails");

    const db = await getDb();
    const transactions = db.collection<Transaction>("accountingTransactions");

    if (id) {
      const txn = await transactions.findOne({ _id: new ObjectId(id) });
      if (!txn) return errors.notFound("Transaction not found");

      if (includeDetails === "true") {
        const details = await db
          .collection<TransactionDetail>("accountingTransactionDetails")
          .find({ transaction: txn._id })
          .toArray();
        return Response.json({ ...txn, details });
      }

      return Response.json(txn);
    }

    const filter = buildFilter(searchParams, {
      code: { type: "regex" },
      status: { type: "exact" },
      source: { type: "exact" },
      startDate: { type: "dateRange", startField: "effectiveDate" },
      endDate: { type: "dateRange", endField: "effectiveDate" },
      vendor: { type: "regex", field: "reference" },
    });

    const docs = await transactions
      .find(filter)
      .sort({ "created.at": -1 })
      .toArray();

    return Response.json(docs);
  } catch (error) {
    console.error("Transaction GET error:", error);
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
    const { type, effectiveDate, reference, information, lines, evidence } = body;

    if (!lines || lines.length < 2) return errors.validation("At least 2 journal lines required.");

    const totalDb = lines.filter((l: { position: string }) => l.position === "Db").reduce((s: number, l: { amount: number }) => s + l.amount, 0);
    const totalCr = lines.filter((l: { position: string }) => l.position === "Cr").reduce((s: number, l: { amount: number }) => s + l.amount, 0);

    if (Math.abs(totalDb - totalCr) > 0.01) return errors.unbalancedJournal();

    const db = await getDb();
    const now = new Date();
    const txnId = new ObjectId();
    const userId = new ObjectId(session.userId);

    const evidenceItems = (evidence || []).map((e: any) => ({
      url: e.url,
      ...(e.description ? { description: e.description } : {}),
    }));

    const txn: Transaction = {
      _id: txnId,
      code: generateCode(type || "General", effectiveDate),
      effectiveDate: new Date(effectiveDate || now),
      reference,
      information,
      amount: totalDb,
      evidence: evidenceItems,
      status: "Pending",
      source: "ui",
      created: { at: now, by: userId },
      updated: { at: now, by: userId },
    };

    const details: TransactionDetail[] = lines.map((line: { account: string; position: string; amount: number }) => ({
      _id: new ObjectId(),
      transaction: txnId,
      account: new ObjectId(line.account),
      position: line.position,
      amount: line.amount,
    }));

    await db.collection("accountingTransactions").insertOne(txn);
    await db.collection("accountingTransactionDetails").insertMany(details);

    return Response.json(txn, { status: 201 });
  } catch (error) {
    console.error("Transaction POST error:", error);
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
    const { _id, type, effectiveDate, reference, information, lines } = body;

    if (!_id) {
      return Response.json({ error: "ID is required." }, { status: 400 });
    }

    const db = await getDb();
    const transactions = db.collection<Transaction>("accountingTransactions");

    const existing = await transactions.findOne({ _id: new ObjectId(_id) });
    if (!existing) {
      return Response.json({ error: "Not found." }, { status: 404 });
    }
    if (existing.status !== "Pending") {
      return Response.json({ error: "Only pending transactions can be edited." }, { status: 400 });
    }

    const userId = new ObjectId(session.userId);

    if (lines) {
      if (lines.length < 2) {
        return Response.json({ error: "At least 2 journal lines required." }, { status: 400 });
      }

      const totalDb = lines.filter((l: { position: string }) => l.position === "Db").reduce((s: number, l: { amount: number }) => s + l.amount, 0);
      const totalCr = lines.filter((l: { position: string }) => l.position === "Cr").reduce((s: number, l: { amount: number }) => s + l.amount, 0);

      if (Math.abs(totalDb - totalCr) > 0.01) {
        return Response.json({ error: "Debits must equal credits." }, { status: 400 });
      }

      await db.collection("accountingTransactionDetails").deleteMany({ transaction: existing._id });

      const details: TransactionDetail[] = lines.map((line: { account: string; position: string; amount: number }) => ({
        _id: new ObjectId(),
        transaction: existing._id,
        account: new ObjectId(line.account),
        position: line.position,
        amount: line.amount,
      }));

      await db.collection("accountingTransactionDetails").insertMany(details);

      await transactions.updateOne(
        { _id: existing._id },
        {
          $set: {
            amount: totalDb,
            updated: { at: new Date(), by: userId },
          },
        }
      );
    }

    const updateData: Record<string, unknown> = {
      updated: { at: new Date(), by: userId },
    };
    if (effectiveDate) updateData.effectiveDate = new Date(effectiveDate);
    if (reference !== undefined) updateData.reference = reference;
    if (information !== undefined) updateData.information = information;

    await transactions.updateOne({ _id: existing._id }, { $set: updateData });

    return Response.json({ message: "Updated." });
  } catch (error) {
    console.error("Transaction PUT error:", error);
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
    const id = searchParams.get("id");
    const action = searchParams.get("action");

    if (!id) {
      return Response.json({ error: "ID is required." }, { status: 400 });
    }

    if (action !== "reverse") {
      return Response.json({ error: "Unknown action." }, { status: 400 });
    }

    const db = await getDb();
    const transactions = db.collection<Transaction>("accountingTransactions");
    const existing = await transactions.findOne({ _id: new ObjectId(id) });

    if (!existing) {
      return Response.json({ error: "Not found." }, { status: 404 });
    }
    if (existing.status !== "Confirmed") {
      return Response.json({ error: "Only confirmed transactions can be reversed." }, { status: 400 });
    }

    const userId = new ObjectId(session.userId);
    const now = new Date();
    const reversalId = new ObjectId();

    const details = await db
      .collection<TransactionDetail>("accountingTransactionDetails")
      .find({ transaction: existing._id })
      .toArray();

    const reversalDetails: TransactionDetail[] = details.map((d) => ({
      _id: new ObjectId(),
      transaction: reversalId,
      account: d.account,
      position: d.position === "Db" ? "Cr" as const : "Db" as const,
      amount: d.amount,
    }));

    const reversal: Transaction = {
      _id: reversalId,
      code: `REV-${existing.code}`,
      effectiveDate: now,
      reference: existing.code,
      information: `Reversal of ${existing.code}${existing.information ? ` - ${existing.information}` : ""}`,
      amount: existing.amount,
      evidence: [],
      status: "Pending",
      source: "ui",
      created: { at: now, by: userId },
      updated: { at: now, by: userId },
    };

    await transactions.insertOne(reversal);
    await db.collection("accountingTransactionDetails").insertMany(reversalDetails);

    await transactions.updateOne(
      { _id: existing._id },
      {
        $set: {
          status: "Reversed",
          "reversed.at": now,
          "reversed.by": userId,
          updated: { at: now, by: userId },
        },
      }
    );

    const allAccountIds = [...new Set([...details.map((d) => d.account), ...reversalDetails.map((d) => d.account)])];
    await recalculateMultipleBalances(allAccountIds);

    return Response.json({ message: "Reversed." });
  } catch (error) {
    console.error("Transaction PATCH error:", error);
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
    const action = searchParams.get("action");

    if (!id) {
      return Response.json({ error: "ID is required." }, { status: 400 });
    }

    const db = await getDb();
    const transactions = db.collection<Transaction>("accountingTransactions");
    const existing = await transactions.findOne({ _id: new ObjectId(id) });

    if (!existing) {
      return Response.json({ error: "Not found." }, { status: 404 });
    }

    const userId = new ObjectId(session.userId);
    const now = new Date();

    if (action === "confirm") {
      if (existing.status !== "Pending") {
        return Response.json({ error: "Only pending transactions can be confirmed." }, { status: 400 });
      }

      await transactions.updateOne(
        { _id: existing._id },
        {
          $set: {
            status: "Confirmed",
            updated: { at: now, by: userId },
            confirmed: { at: now, by: userId },
          },
        }
      );

      const details = await db
        .collection<TransactionDetail>("accountingTransactionDetails")
        .find({ transaction: existing._id })
        .toArray();

      const accountIds = [...new Set(details.map((d) => d.account))];
      await recalculateMultipleBalances(accountIds);

      return Response.json({ message: "Confirmed." });
    }

    if (action === "reject") {
      if (existing.status !== "Pending") {
        return Response.json({ error: "Only pending transactions can be rejected." }, { status: 400 });
      }

      await transactions.updateOne(
        { _id: existing._id },
        {
          $set: {
            status: "Rejected",
            updated: { at: now, by: userId },
            rejected: { at: now, by: userId },
          },
        }
      );

      return Response.json({ message: "Rejected." });
    }

    // Soft delete (pending only)
    if (existing.status !== "Pending") {
      return Response.json({ error: "Only pending transactions can be deleted." }, { status: 400 });
    }

    await transactions.updateOne(
      { _id: existing._id },
      {
        $set: {
          status: "Canceled",
          updated: { at: now, by: userId },
        },
      }
    );

    return Response.json({ message: "Deleted." });
  } catch (error) {
    console.error("Transaction DELETE error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
