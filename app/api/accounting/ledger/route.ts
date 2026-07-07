import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import type { Account, ChartOfAccount, Transaction, TransactionDetail } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!accountId) {
      return Response.json({ error: "accountId is required." }, { status: 400 });
    }

    const db = await getDb();

    const account = await db.collection<Account>("accountingAccounts").findOne({
      _id: new ObjectId(accountId),
    });
    if (!account) {
      return Response.json({ error: "Account not found." }, { status: 404 });
    }

    const coa = await db.collection<ChartOfAccount>("accountingCoa").findOne({
      _id: account.coa,
    });
    if (!coa) {
      return Response.json({ error: "COA not found." }, { status: 404 });
    }

    const start = startDate ? new Date(startDate) : new Date("2000-01-01");
    const end = endDate ? new Date(endDate) : new Date();

    // Opening balance (confirmed transactions before start date)
    const [openingResult] = await db
      .collection("accountingTransactionDetails")
      .aggregate([
        { $match: { account: account._id } },
        {
          $lookup: {
            from: "accountingTransactions",
            localField: "transaction",
            foreignField: "_id",
            as: "txn",
          },
        },
        { $unwind: "$txn" },
        { $match: { "txn.status": "Confirmed", "txn.effectiveDate": { $lt: start } } },
        {
          $group: {
            _id: null,
            totalDb: { $sum: { $cond: [{ $eq: ["$position", "Db"] }, "$amount", 0] } },
            totalCr: { $sum: { $cond: [{ $eq: ["$position", "Cr"] }, "$amount", 0] } },
          },
        },
      ])
      .toArray();

    let openingBalance = 0;
    if (openingResult) {
      openingBalance =
        coa.position === "Db"
          ? openingResult.totalDb - openingResult.totalCr
          : openingResult.totalCr - openingResult.totalDb;
    }

    // Period mutations
    const mutations = await db
      .collection("accountingTransactionDetails")
      .aggregate([
        { $match: { account: account._id } },
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
            "txn.effectiveDate": { $gte: start, $lte: end },
          },
        },
        { $sort: { "txn.effectiveDate": 1 } },
        {
          $project: {
            _id: 0,
            date: "$txn.effectiveDate",
            code: "$txn.code",
            information: "$txn.information",
            position: 1,
            amount: 1,
          },
        },
      ])
    .toArray();

    // Compute running balance
    let running = openingBalance;
    const rows = mutations.map((m) => {
      const isDb = m.position === "Db";
      const debit = isDb ? m.amount : 0;
      const credit = isDb ? 0 : m.amount;

      const contribution =
        coa.position === "Db"
          ? (isDb ? m.amount : -m.amount)
          : (isDb ? -m.amount : m.amount);
      running += contribution;

      return {
        date: m.date,
        code: m.code,
        information: m.information,
        debit,
        credit,
        balance: running,
      };
    });

    return Response.json({
      account: { number: account.number, name: account.name },
      coa: { name: coa.name, position: coa.position, category: coa.category },
      openingBalance,
      startDate: start,
      endDate: end,
      rows,
    });
  } catch (error) {
    console.error("Ledger GET error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
