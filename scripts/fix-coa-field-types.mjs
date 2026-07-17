import { MongoClient, ObjectId } from "mongodb";
import { readFileSync } from "fs";

const DRY_RUN = !process.argv.includes("--apply");

const envRaw = readFileSync(new URL("../.env", import.meta.url), "utf8");
const uriMatch = envRaw.match(/MONGO_URI=(.*)/);
if (!uriMatch) throw new Error("MONGO_URI not found in .env");
const uri = uriMatch[1].trim().replace(/^["']|["']$/g, "");

const client = new MongoClient(uri);
await client.connect();
const coa = client.db().collection("accountingCoa");

const all = await coa.find({}).toArray();
const validIds = new Set(all.map((d) => d._id.toString()));

const ops = [];
const report = { parentToObjectId: [], parentToNull: [], codeToString: [] };

for (const doc of all) {
  const set = {};

  if (typeof doc.code !== "string") {
    set.code = String(doc.code);
    report.codeToString.push(`${doc.code} -> "${set.code}"`);
  }

  if (doc.parent !== null && doc.parent !== undefined && typeof doc.parent === "string") {
    if (ObjectId.isValid(doc.parent) && validIds.has(doc.parent)) {
      set.parent = new ObjectId(doc.parent);
      report.parentToObjectId.push(`${doc.code}: parent "${doc.parent}" -> ObjectId`);
    } else {
      set.parent = null;
      report.parentToNull.push(`${doc.code}: invalid/dangling parent "${doc.parent}" -> null`);
    }
  }

  if (Object.keys(set).length > 0) {
    ops.push({ updateOne: { filter: { _id: doc._id }, update: { $set: set } } });
  }
}

console.log(`Scanned ${all.length} COA docs.`);
console.log(`parent(string)->ObjectId: ${report.parentToObjectId.length}`);
report.parentToObjectId.forEach((l) => console.log("  " + l));
console.log(`parent(invalid)->null:    ${report.parentToNull.length}`);
report.parentToNull.forEach((l) => console.log("  " + l));
console.log(`code(number)->string:     ${report.codeToString.length}`);
report.codeToString.forEach((l) => console.log("  " + l));
console.log(`\nTotal docs to update: ${ops.length}`);

if (DRY_RUN) {
  console.log("\nDRY RUN — no changes written. Re-run with --apply to persist.");
} else if (ops.length > 0) {
  const res = await coa.bulkWrite(ops);
  console.log(`\nAPPLIED. modifiedCount=${res.modifiedCount}`);
} else {
  console.log("\nNothing to change.");
}

await client.close();
