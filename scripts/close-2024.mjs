import { MongoClient, ObjectId } from "mongodb";
import { readFileSync } from "fs";

const uri = readFileSync(new URL("../.env", import.meta.url), "utf8")
  .match(/MONGO_URI=(.*)/)[1]
  .trim()
  .replace(/^["']|["']$/g, "");

const APPLY = process.argv.includes("--apply");
const fiscalYear = 2024;
const retainedEarningsAccountId = "6a484b722f44146afe3e757a"; // 3030201 Laba Ditahan Tahun-Tahun Lalu

const c = new MongoClient(uri);
await c.connect();
const db = c.db();

const existing = await db.collection("accountingTransactions").findOne({ code: `CLS-${fiscalYear}` });
if (existing) {
  console.log("CLS-2024 already exists, aborting.");
  await c.close();
  process.exit(0);
}

const startDate = new Date(`${fiscalYear}-01-01`);
const endDate = new Date(`${fiscalYear}-12-31`);

const rows = await db
  .collection("accountingTransactionDetails")
  .aggregate([
    { $lookup: { from: "accountingTransactions", localField: "transaction", foreignField: "_id", as: "txn" } },
    { $unwind: "$txn" },
    { $match: { "txn.status": "Confirmed", "txn.effectiveDate": { $gte: startDate, $lte: endDate } } },
    { $lookup: { from: "accountingAccounts", localField: "account", foreignField: "_id", as: "acc" } },
    { $unwind: "$acc" },
    { $lookup: { from: "accountingCoa", localField: "acc.coa", foreignField: "_id", as: "coa" } },
    { $unwind: "$coa" },
    { $match: { $or: [{ "coa.category": "Revenue" }, { "coa.category": "COGS" }, { "coa.category": "Expense" }] } },
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

const lines = [];
let netProfit = 0;
for (const row of rows) {
  const balance = row.coaPosition === "Db" ? row.totalDb - row.totalCr : row.totalCr - row.totalDb;
  if (balance === 0) continue;
  if (row.coaCategory === "Revenue") {
    lines.push({ account: row._id, position: "Db", amount: balance });
    netProfit += balance;
  } else {
    lines.push({ account: row._id, position: "Cr", amount: balance });
    netProfit -= balance;
  }
}

if (lines.length === 0) {
  console.log("No P&L entries to close.");
  await c.close();
  process.exit(0);
}

if (netProfit >= 0) {
  lines.push({ account: new ObjectId(retainedEarningsAccountId), position: "Cr", amount: netProfit });
} else {
  lines.push({ account: new ObjectId(retainedEarningsAccountId), position: "Db", amount: Math.abs(netProfit) });
}

console.log("fiscalYear:", fiscalYear, "netProfit:", netProfit);
for (const l of lines) console.log("  ", l.position, l.amount, "acct", l.account.toString());

if (!APPLY) {
  console.log("\nDRY RUN. Add --apply to post.");
  await c.close();
  process.exit(0);
}

const now = new Date();
const txnId = new ObjectId();
await db.collection("accountingTransactions").insertOne({
  _id: txnId,
  code: `CLS-${fiscalYear}`,
  effectiveDate: endDate,
  information: `Year-end closing for ${fiscalYear}`,
  amount: lines.reduce((s, l) => s + l.amount, 0) / 2,
  evidence: [],
  status: "Confirmed",
  source: "ui",
  created: { at: now, by: null },
  updated: { at: now, by: null },
  confirmed: { at: now, by: null },
});
await db.collection("accountingTransactionDetails").insertMany(
  lines.map((l) => ({ _id: new ObjectId(), transaction: txnId, account: l.account, position: l.position, amount: l.amount }))
);

console.log("\nPOSTED CLS-2024.");
await c.close();
