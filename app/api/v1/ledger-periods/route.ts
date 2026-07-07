import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { verifyApiKey } from "@/lib/api-auth";
import type { Account, ChartOfAccount, Transaction, TransactionDetail } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    const session = await verifyApiKey(request);
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");
    if (!accountId) return Response.json({ error: "accountId is required." }, { status: 400 });

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const db = await getDb();
    const accounts = db.collection<Account>("accountingAccounts");

    const account = await accounts.findOne({ _id: new ObjectId(accountId) });
    if (!account) return Response.json({ error: "Account not found." }, { status: 404 });

    const coaDoc = await db.collection<ChartOfAccount>("accountingCoa").findOne({ _id: account.coa });

    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : now;

    const transactions = db.collection<Transaction>("accountingTransactions");
    const details = db.collection<TransactionDetail>("accountingTransactionDetails");

    const txnFilter: Record<string, unknown> = { status: "Confirmed", effectiveDate: { $lt: start } };
    const openingTxnIds = await transactions.find(txnFilter, { projection: { _id: 1 } }).toArray();
    const openingDetails = await details
      .find({ transaction: { $in: openingTxnIds.map((t) => t._id) }, account: account._id })
      .toArray();

    const openingBalance = openingDetails.reduce((sum, d) => {
      if (coaDoc?.position === "Db") return sum + (d.position === "Db" ? d.amount : -d.amount);
      return sum + (d.position === "Cr" ? d.amount : -d.amount);
    }, 0);

    const periodTxnFilter: Record<string, unknown> = {
      status: "Confirmed",
      effectiveDate: { $gte: start, $lte: end },
    };
    const periodTxnIds = await transactions.find(periodTxnFilter, { projection: { _id: 1 } }).toArray();
    const periodDetails = await details
      .find({ transaction: { $in: periodTxnIds.map((t) => t._id) }, account: account._id })
      .toArray();

    const periodTxns = await transactions
      .find({ _id: { $in: periodTxnIds.map((t) => t._id) } })
      .sort({ effectiveDate: 1 })
      .toArray();

    let runningBalance = openingBalance;
    const rows = periodTxns.map((txn) => {
      const det = periodDetails.find((d) => d.transaction.toString() === txn._id.toString());
      const debit = det?.position === "Db" ? det.amount : 0;
      const credit = det?.position === "Cr" ? det.amount : 0;

      if (coaDoc?.position === "Db") {
        runningBalance += debit - credit;
      } else {
        runningBalance += credit - debit;
      }

      return {
        date: txn.effectiveDate,
        code: txn.code,
        information: txn.information,
        debit,
        credit,
        balance: runningBalance,
      };
    });

    return Response.json({
      account: { number: account.number, name: account.name },
      coa: coaDoc ? { code: coaDoc.code, name: coaDoc.name, position: coaDoc.position } : null,
      openingBalance,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      rows,
    });
  } catch (error) {
    console.error("v1 ledger-periods GET error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
