import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { verifyApiKey } from "@/lib/api-auth";
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
    const session = await verifyApiKey(request);
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const status = searchParams.get("status");
    const includeDetails = searchParams.get("includeDetails");

    const db = await getDb();
    const transactions = db.collection<Transaction>("accountingTransactions");

    if (id) {
      const txn = await transactions.findOne({ _id: new ObjectId(id) });
      if (!txn) return Response.json({ error: "Not found." }, { status: 404 });

      if (includeDetails === "true") {
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
      }

      return Response.json(txn);
    }

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;

    const docs = await transactions
      .find(filter)
      .sort({ "created.at": -1 })
      .toArray();

    return Response.json(docs);
  } catch (error) {
    console.error("v1 Transaction GET error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyApiKey(request);
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { type, effectiveDate, reference, information, lines } = body;

    if (!lines || lines.length < 2) {
      return Response.json({ error: "At least 2 journal lines required." }, { status: 400 });
    }

    // Map debit/credit format to position/amount format
    const mappedLines = lines.map((line: any) => {
      if (line.debit !== undefined && line.debit > 0) {
        return { account: line.accountId, position: "Db" as const, amount: line.debit };
      }
      if (line.credit !== undefined && line.credit > 0) {
        return { account: line.accountId, position: "Cr" as const, amount: line.credit };
      }
      // Support legacy position/amount format too
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

    const db = await getDb();
    const now = new Date();
    const txnId = new ObjectId();
    const userId = new ObjectId(session.userId);

    const txn: Transaction = {
      _id: txnId,
      code: generateCode(type || "General", effectiveDate),
      effectiveDate: new Date(effectiveDate || now),
      reference,
      information,
      amount: totalDb,
      evidence: [],
      status: "Pending",
      source: "api",
      created: { at: now, by: userId },
      updated: { at: now, by: userId },
    };

    const details: TransactionDetail[] = mappedLines.map((line: { account: string; position: "Db" | "Cr"; amount: number }) => ({
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
    console.error("v1 Transaction POST error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
