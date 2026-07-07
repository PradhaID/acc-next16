import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { recalculateMultipleBalances } from "@/lib/accounting/balance";
import type { Transaction, TransactionDetail } from "@/lib/models";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { fiscalYear, retainedEarningsAccountId } = body;

    if (!fiscalYear || !retainedEarningsAccountId) {
      return Response.json(
        { error: "fiscalYear and retainedEarningsAccountId are required." },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Check if closing already exists for this year
    const existing = await db.collection<Transaction>("accountingTransactions").findOne({
      code: `CLS-${fiscalYear}`,
    });
    if (existing) {
      return Response.json(
        { error: `Closing for ${fiscalYear} already exists.` },
        { status: 409 }
      );
    }

    const startDate = new Date(`${fiscalYear}-01-01`);
    const endDate = new Date(`${fiscalYear}-12-31`);

    // Get revenue and expense account balances
    const rows = await db
      .collection("accountingTransactionDetails")
      .aggregate([
        {
          $lookup: {
            from: "accountingTransactions",
            localField: "transaction",
            foreignField: "_id",
            as: "txn",
          },
        },
        { $unwind: "$txn" },
        {
          $match: {
            "txn.status": "Confirmed",
            "txn.effectiveDate": { $gte: startDate, $lte: endDate },
          },
        },
        {
          $lookup: {
            from: "accountingAccounts",
            localField: "account",
            foreignField: "_id",
            as: "acc",
          },
        },
        { $unwind: "$acc" },
        {
          $lookup: {
            from: "accountingCoa",
            localField: "acc.coa",
            foreignField: "_id",
            as: "coa",
          },
        },
        { $unwind: "$coa" },
        {
          $match: {
            $or: [{ "coa.category": "Revenue" }, { "coa.category": "COGS" }, { "coa.category": "Expense" }],
          },
        },
        {
          $group: {
            _id: "$account",
            coaCategory: { $first: "$coa.category" },
            coaPosition: { $first: "$coa.position" },
            totalDb: { $sum: { $cond: [{ $eq: ["$position", "Db"] }, "$amount", 0] } },
            totalCr: { $sum: { $cond: [{ $eq: ["$position", "Cr"] }, "$amount", 0] } },
          },
        },
      ])
      .toArray();

    const lines: { account: ObjectId; position: "Db" | "Cr"; amount: number }[] = [];
    let netProfit = 0;

    for (const row of rows) {
      const balance =
        row.coaPosition === "Db"
          ? row.totalDb - row.totalCr
          : row.totalCr - row.totalDb;

      if (balance === 0) continue;

      if (row.coaCategory === "Revenue") {
        // Revenue has credit normal balance — debit to close
        lines.push({
          account: row._id,
          position: "Db",
          amount: balance,
        });
        netProfit += balance;
      } else {
        // COGS & Expense have debit normal balance — credit to close
        lines.push({
          account: row._id,
          position: "Cr",
          amount: balance,
        });
        netProfit -= balance;
      }
    }

    if (lines.length === 0) {
      return Response.json({ message: "No revenue or expense entries to close." });
    }

    // Add retained earnings entry
    if (netProfit >= 0) {
      lines.push({
        account: new ObjectId(retainedEarningsAccountId),
        position: "Cr",
        amount: netProfit,
      });
    } else {
      lines.push({
        account: new ObjectId(retainedEarningsAccountId),
        position: "Db",
        amount: Math.abs(netProfit),
      });
    }

    const now = new Date();
    const userId = new ObjectId(session.userId);
    const txnId = new ObjectId();

    const transaction: Transaction = {
      _id: txnId,
      code: `CLS-${fiscalYear}`,
      effectiveDate: endDate,
      information: `Year-end closing for ${fiscalYear}`,
      amount: lines.reduce((s, l) => s + l.amount, 0) / 2,
      evidence: [],
      status: "Confirmed",
      source: "ui",
      created: { at: now, by: userId },
      updated: { at: now, by: userId },
      confirmed: { at: now, by: userId },
    };

    const details: TransactionDetail[] = lines.map((l) => ({
      _id: new ObjectId(),
      transaction: txnId,
      account: l.account,
      position: l.position,
      amount: l.amount,
    }));

    await db.collection("accountingTransactions").insertOne(transaction);
    await db.collection("accountingTransactionDetails").insertMany(details);

    const accountIds = [...new Set(lines.map((l) => l.account))];
    await recalculateMultipleBalances(accountIds);

    return Response.json({
      message: `Closing completed for ${fiscalYear}.`,
      netProfit,
      linesCount: lines.length,
    });
  } catch (error) {
    console.error("Closing POST error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
