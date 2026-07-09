import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

interface AccountLine {
  number: string;
  name: string;
  balance: number;
}

interface TreeNode {
  _id: string;
  code: string;
  name: string;
  position: "Db" | "Cr";
  children: TreeNode[];
  total: number;
  accounts: AccountLine[];
}

function buildTree(
  coas: { _id: ObjectId; code: string; name: string; position: string; parent: ObjectId | null }[],
  parentId: string | null,
): TreeNode[] {
  return coas
    .filter((c) => {
      const pid = c.parent ? (typeof c.parent === "string" ? c.parent : c.parent.toHexString()) : null;
      return pid === parentId;
    })
    .sort((a, b) => String(a.code).localeCompare(String(b.code), undefined, { numeric: true }))
    .map((c) => {
      const id = c._id.toHexString();
      const children = buildTree(coas, id);
      return {
        _id: id,
        code: c.code,
        name: c.name,
        position: c.position as "Db" | "Cr",
        children,
        total: 0,
        accounts: [],
      };
    });
}

function computeTotals(node: TreeNode): number {
  let sum = node.accounts.reduce((acc, a) => acc + a.balance, 0);
  for (const child of node.children) {
    sum += computeTotals(child);
  }
  node.total = sum;
  return sum;
}

function findNode(root: TreeNode, id: string): TreeNode | null {
  if (root._id === id) return root;
  for (const child of root.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const asOfDate = dateParam ? new Date(dateParam) : new Date();

    const db = await getDb();

    const allCoas = (await db
      .collection("accountingCoa")
      .find({ category: { $in: ["Asset", "Liability", "Equity"] } })
      .sort({ code: 1 })
      .toArray()) as { _id: ObjectId; code: string; name: string; position: string; parent: ObjectId | null; category: string }[];

    const coaMap = new Map(allCoas.map((c) => [c._id.toHexString(), c]));

    const allAccounts = await db
      .collection("accountingAccounts")
      .find({ isActive: true })
      .sort({ number: 1 })
      .toArray();

    const netIncomeRows = await db
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
        { $match: { "txn.status": "Confirmed", "txn.effectiveDate": { $lte: asOfDate } } },
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
        { $match: { "coa.category": { $in: ["Revenue", "COGS", "Expense"] } } },
        {
          $group: {
            _id: null,
            totalDb: { $sum: { $cond: [{ $eq: ["$position", "Db"] }, "$amount", 0] } },
            totalCr: { $sum: { $cond: [{ $eq: ["$position", "Cr"] }, "$amount", 0] } },
          },
        },
      ])
      .toArray();

    let netIncome = 0;
    if (netIncomeRows.length > 0) {
      const r = netIncomeRows[0];
      netIncome = r.totalCr - r.totalDb;
    }

    const catPosition: Record<string, "Db" | "Cr"> = {
      Asset: "Db",
      Liability: "Cr",
      Equity: "Cr",
    };

    const buildForCategory = (cat: string): TreeNode => {
      const coas = allCoas.filter((c) => c.category === cat);
      const children = buildTree(coas, null);
      return {
        _id: cat,
        code: "",
        name: cat.toUpperCase(),
        position: catPosition[cat] || "Db",
        children,
        total: 0,
        accounts: [],
      };
    };

    const assets = buildForCategory("Asset");
    const liabilities = buildForCategory("Liability");
    const equity = buildForCategory("Equity");

    for (const acc of allAccounts) {
      const coaId = acc.coa instanceof ObjectId ? acc.coa.toHexString() : String(acc.coa);
      const coa = coaMap.get(coaId);
      if (!coa) continue;

      const balance = acc.balance || 0;

      const root = coa.category === "Asset" ? assets : coa.category === "Liability" ? liabilities : equity;
      const node = findNode(root, coaId);
      if (node) {
        node.accounts.push({
          number: acc.number,
          name: acc.name,
          balance,
        });
      }
    }

    computeTotals(assets);
    computeTotals(liabilities);
    computeTotals(equity);

    equity.total += netIncome;

    return Response.json({
      asOfDate,
      assets,
      liabilities,
      equity,
      netIncome,
    });
  } catch (error) {
    console.error("Balance Sheet GET error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
