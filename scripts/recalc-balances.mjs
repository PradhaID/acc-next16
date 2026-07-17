import { MongoClient, ObjectId } from "mongodb";
import { readFileSync } from "fs";

const uri = readFileSync(new URL("../.env", import.meta.url), "utf8")
  .match(/MONGO_URI=(.*)/)[1]
  .trim()
  .replace(/^["']|["']$/g, "");

const ids = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (ids.length === 0) {
  console.log("Usage: node recalc-balances.mjs <accountId> [accountId...]");
  process.exit(1);
}

const c = new MongoClient(uri);
await c.connect();
const db = c.db();

for (const idStr of ids) {
  const accountId = new ObjectId(idStr);
  const account = await db.collection("accountingAccounts").findOne({ _id: accountId });
  if (!account) {
    console.log(idStr, "-> account not found");
    continue;
  }
  const coa = await db.collection("accountingCoa").findOne({ _id: account.coa });
  if (!coa) {
    console.log(idStr, "-> coa not found");
    continue;
  }
  const [result] = await db
    .collection("accountingTransactionDetails")
    .aggregate([
      { $match: { account: accountId } },
      { $lookup: { from: "accountingTransactions", localField: "transaction", foreignField: "_id", as: "txn" } },
      { $unwind: "$txn" },
      { $match: { "txn.status": "Confirmed" } },
      {
        $group: {
          _id: null,
          totalDb: { $sum: { $cond: [{ $eq: ["$position", "Db"] }, "$amount", 0] } },
          totalCr: { $sum: { $cond: [{ $eq: ["$position", "Cr"] }, "$amount", 0] } },
        },
      },
    ])
    .toArray();
  let balance = 0;
  if (result) balance = coa.position === "Db" ? result.totalDb - result.totalCr : result.totalCr - result.totalDb;
  await db.collection("accountingAccounts").updateOne(
    { _id: accountId },
    { $set: { balance, updated: { at: new Date(), by: null } } }
  );
  console.log(`${account.number} ${account.name} -> balance=${balance}`);
}

await c.close();
