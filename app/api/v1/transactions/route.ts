import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { verifyApiKey } from "@/lib/api-auth";
import { buildFilter } from "@/lib/filter";
import { errors, checkIdempotency, storeIdempotency } from "@/lib/api-error";
import { recalculateMultipleBalances } from "@/lib/accounting/balance";
import type { Transaction, TransactionDetail, EvidenceItem } from "@/lib/models";

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

function mapLines(lines: any[]) {
  return lines.map((line: any) => {
    if (line.debit !== undefined && line.debit > 0) {
      return { account: line.accountId || line.account, position: "Db" as const, amount: line.debit };
    }
    if (line.credit !== undefined && line.credit > 0) {
      return { account: line.accountId || line.account, position: "Cr" as const, amount: line.credit };
    }
    return { account: line.accountId || line.account, position: line.position, amount: line.amount };
  });
}

function validateLines(mappedLines: { account: string; position: string; amount: number }[]): string | null {
  if (!mappedLines || mappedLines.length < 2) {
    return "At least 2 journal lines required.";
  }
  const totalDb = mappedLines
    .filter((l) => l.position === "Db")
    .reduce((s, l) => s + l.amount, 0);
  const totalCr = mappedLines
    .filter((l) => l.position === "Cr")
    .reduce((s, l) => s + l.amount, 0);
  if (Math.abs(totalDb - totalCr) > 0.01) {
    return "Debits must equal credits.";
  }
  for (const line of mappedLines) {
    if (!line.account) return "Each line must specify an account.";
    if (line.amount <= 0) return "Amount must be positive.";
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await verifyApiKey(request);
    if (!session) return errors.unauthorized();

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
    console.error("v1 Transaction GET error:", error);
    return errors.internal();
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyApiKey(request);
    if (!session) return errors.unauthorized();

    // Idempotency check
    const idempotencyKey = request.headers.get("Idempotency-Key");
    if (idempotencyKey) {
      const { exists, response } = await checkIdempotency(idempotencyKey);
      if (exists) return Response.json(response, { status: 200 });
    }

    const body = await request.json();
    const { type, effectiveDate, reference, information, lines, evidence, dryRun } = body;

    if (!lines || lines.length < 2) {
      return errors.validation("At least 2 journal lines required.");
    }

    const mappedLines = mapLines(lines);

    const validationError = validateLines(mappedLines);
    if (validationError) return errors.validation(validationError);

    // Validate accounts exist
    const db = await getDb();
    const accountsCol = db.collection("accountingAccounts");
    const accountIds = [...new Set(mappedLines.map((l) => l.account))];
    const existingAccounts = await accountsCol
      .find({ _id: { $in: accountIds.map((a) => new ObjectId(a)) } })
      .project({ _id: 1 })
      .toArray();
    const existingIds = new Set(existingAccounts.map((a: any) => a._id.toString()));
    for (const accId of accountIds) {
      if (!existingIds.has(accId)) return errors.accountNotFound(accId);
    }

    const totalDb = mappedLines
      .filter((l) => l.position === "Db")
      .reduce((s, l) => s + l.amount, 0);

    if (dryRun) {
      return Response.json({
        valid: true,
        summary: {
          type: type || "General",
          effectiveDate,
          linesCount: mappedLines.length,
          totalDebit: totalDb,
          totalCredit: totalDb,
          accounts: accountIds.length,
        },
      });
    }

    const now = new Date();
    const txnId = new ObjectId();
    const userId = new ObjectId(session.userId);

    const { downloadAndStore } = await import("@/lib/accounting/evidence");
    const evidenceItems: EvidenceItem[] = await Promise.all(
      (evidence || []).map(async (e: any) => ({
        url: await downloadAndStore(e.url),
        ...(e.description ? { description: e.description } : {}),
      }))
    );

    const txn: Transaction = {
      _id: txnId,
      code: generateCode(type || "General", effectiveDate),
      effectiveDate: new Date(effectiveDate || now),
      reference,
      information,
      amount: totalDb,
      evidence: evidenceItems,
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

    const responseBody = txn;

    if (idempotencyKey) {
      await storeIdempotency(idempotencyKey, responseBody);
    }

    return Response.json(responseBody, { status: 201 });
  } catch (error) {
    console.error("v1 Transaction POST error:", error);
    return errors.internal();
  }
}
