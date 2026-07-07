import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { Transaction } from "@/lib/models/accounting/transaction";
import type { TransactionDetail } from "@/lib/models/accounting/transactionDetail";

interface JournalLine {
  accountId: ObjectId;
  position: "Db" | "Cr";
  amount: number;
}

export async function createAutoJournal(
  lines: JournalLine[],
  code: string,
  information: string,
  effectiveDate: Date,
  reference?: string
) {
  const db = await getDb();
  const now = new Date();
  const txnId = new ObjectId();

  const transaction: Transaction = {
    _id: txnId,
    code,
    effectiveDate,
    reference,
    information,
    amount: lines.reduce((s, l) => s + l.amount, 0),
    evidence: [],
    status: "Confirmed",
    source: "ui",
    created: { at: now, by: null },
    updated: { at: now, by: null },
    confirmed: { at: now, by: null },
  };

  const details: TransactionDetail[] = lines.map((line) => ({
    _id: new ObjectId(),
    transaction: txnId,
    account: line.accountId,
    position: line.position,
    amount: line.amount,
  }));

  await db.collection("accountingTransactions").insertOne(transaction);
  await db.collection("accountingTransactionDetails").insertMany(details);

  return txnId;
}
