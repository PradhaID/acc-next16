import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { verifyApiKey } from "@/lib/api-auth";
import { recalculateMultipleBalances } from "@/lib/accounting/balance";
import type { Transaction, TransactionDetail } from "@/lib/models";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifyApiKey(request);
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const db = await getDb();
    const txn = await db.collection<Transaction>("accountingTransactions").findOne({ _id: new ObjectId(id) });
    if (!txn) return Response.json({ error: "Not found." }, { status: 404 });

    const details = await db
      .collection<TransactionDetail>("accountingTransactionDetails")
      .find({ transaction: txn._id })
      .toArray();

    const accountIds = [...new Set(details.map((d) => d.account.toString()))];
    const accounts = await db
      .collection("accountingAccounts")
      .find({ _id: { $in: accountIds.map((a) => new ObjectId(a)) } })
      .project({ number: 1, name: 1 })
      .toArray();
    const accountMap = new Map(accounts.map((a: any) => [a._id.toString(), a]));

    const enrichedDetails = details.map((d) => ({
      account: accountMap.get(d.account.toString()) || { number: "?", name: "?" },
      position: d.position,
      amount: d.amount,
      debit: d.position === "Db" ? d.amount : 0,
      credit: d.position === "Cr" ? d.amount : 0,
    }));

    return Response.json({ ...txn, details: enrichedDetails });
  } catch (error) {
    console.error("v1 Transaction GET error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifyApiKey(request);
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { effectiveDate, reference, information, lines } = body;

    const db = await getDb();
    const transactions = db.collection<Transaction>("accountingTransactions");

    const existing = await transactions.findOne({ _id: new ObjectId(id) });
    if (!existing) return Response.json({ error: "Not found." }, { status: 404 });
    if (existing.status !== "Pending") {
      return Response.json({ error: "Only pending transactions can be edited." }, { status: 400 });
    }

    const userId = new ObjectId(session.userId);

    if (lines) {
      if (lines.length < 2) {
        return Response.json({ error: "At least 2 journal lines required." }, { status: 400 });
      }

      const mappedLines = lines.map((line: any) => {
        if (line.debit !== undefined && line.debit > 0) {
          return { account: line.accountId, position: "Db" as const, amount: line.debit };
        }
        if (line.credit !== undefined && line.credit > 0) {
          return { account: line.accountId, position: "Cr" as const, amount: line.credit };
        }
        return { account: line.accountId, position: line.position, amount: line.amount };
      });

      const totalDb = mappedLines
        .filter((l: { position: string }) => l.position === "Db")
        .reduce((s: number, l: { amount: number }) => s + l.amount, 0);
      const totalCr = mappedLines
        .filter((l: { position: string }) => l.position === "Cr")
        .reduce((s: number, l: { amount: number }) => s + l.amount, 0);

      if (Math.abs(totalDb - totalCr) > 0.01) {
        return Response.json({ error: "Debits must equal credits." }, { status: 400 });
      }

      await db.collection("accountingTransactionDetails").deleteMany({ transaction: existing._id });

      const details: TransactionDetail[] = mappedLines.map((line: { account: string; position: "Db" | "Cr"; amount: number }) => ({
        _id: new ObjectId(),
        transaction: existing._id,
        account: new ObjectId(line.account),
        position: line.position,
        amount: line.amount,
      }));

      await db.collection("accountingTransactionDetails").insertMany(details);

      await transactions.updateOne(
        { _id: existing._id },
        { $set: { amount: totalDb, updated: { at: new Date(), by: userId } } }
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
    console.error("v1 Transaction PUT error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifyApiKey(request);
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    const db = await getDb();
    const transactions = db.collection<Transaction>("accountingTransactions");
    const existing = await transactions.findOne({ _id: new ObjectId(id) });
    if (!existing) return Response.json({ error: "Not found." }, { status: 404 });

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

    if (action === "cancel") {
      if (existing.status !== "Pending") {
        return Response.json({ error: "Only pending transactions can be cancelled." }, { status: 400 });
      }

      await db.collection("accountingTransactionDetails").deleteMany({ transaction: existing._id });
      await transactions.deleteOne({ _id: existing._id });

      return Response.json({ message: "Deleted." });
    }

    return Response.json({ error: "Unknown action. Use confirm, reject, or cancel." }, { status: 400 });
  } catch (error) {
    console.error("v1 Transaction DELETE error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
