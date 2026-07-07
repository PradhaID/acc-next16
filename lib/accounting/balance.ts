import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { Account } from "@/lib/models/accounting/account";
import type { ChartOfAccount } from "@/lib/models/accounting/coa";

export async function recalculateBalance(accountId: ObjectId) {
  const db = await getDb();

  const account = await db.collection<Account>("accountingAccounts").findOne({ _id: accountId });
  if (!account) return;

  const coa = await db.collection<ChartOfAccount>("accountingCoa").findOne({ _id: account.coa });
  if (!coa) return;

  const [result] = await db
    .collection("accountingTransactionDetails")
    .aggregate([
      {
        $match: { account: accountId },
      },
      {
        $lookup: {
          from: "accountingTransactions",
          localField: "transaction",
          foreignField: "_id",
          as: "txn",
        },
      },
      { $unwind: "$txn" },
      { $match: { "txn.status": "Confirmed" } },
      {
        $group: {
          _id: null,
          totalDb: {
            $sum: {
              $cond: [{ $eq: ["$position", "Db"] }, "$amount", 0],
            },
          },
          totalCr: {
            $sum: {
              $cond: [{ $eq: ["$position", "Cr"] }, "$amount", 0],
            },
          },
        },
      },
    ])
    .toArray();

  let balance = 0;
  if (result) {
    if (coa.position === "Db") {
      balance = result.totalDb - result.totalCr;
    } else {
      balance = result.totalCr - result.totalDb;
    }
  }

  await db.collection<Account>("accountingAccounts").updateOne(
    { _id: accountId },
    {
      $set: {
        balance,
        updated: { at: new Date(), by: null },
      },
    }
  );
}

export async function recalculateMultipleBalances(accountIds: ObjectId[]) {
  for (const id of accountIds) {
    await recalculateBalance(id);
  }
}

export async function recalculateAllBalances() {
  const db = await getDb();
  const accounts = await db
    .collection<Account>("accountingAccounts")
    .find({ isActive: true })
    .toArray();
  for (const account of accounts) {
    await recalculateBalance(account._id);
  }
}
