import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { verifyApiKey } from "@/lib/api-auth";
import type { ChartOfAccount, Account, Transaction, TransactionDetail, CoaCategory } from "@/lib/models";

interface TreeNode {
  _id: string;
  code: string;
  name: string;
  children: TreeNode[];
  accounts: { number: string; name: string; balance: number }[];
  total: number;
}

async function buildTree(
  parentId: string | null,
  categories: CoaCategory[],
  asOfDate: Date
): Promise<TreeNode[]> {
  const db = await getDb();
  const coaCollection = db.collection<ChartOfAccount>("accountingCoa");
  const accountCollection = db.collection<Account>("accountingAccounts");
  const txnCollection = db.collection<Transaction>("accountingTransactions");
  const detailCollection = db.collection<TransactionDetail>("accountingTransactionDetails");

  const nodes = await coaCollection
    .find({ parent: parentId ? new ObjectId(parentId) : null, category: { $in: categories }, isActive: true })
    .sort({ code: 1 })
    .toArray();

  const result: TreeNode[] = [];

  for (const node of nodes) {
    const children = await buildTree(node._id.toString(), categories, asOfDate);

    const accountDocs = await accountCollection
      .find({ coa: node._id, isActive: true })
      .sort({ number: 1 })
      .toArray();

    const txnFilter: Record<string, unknown> = {
      status: "Confirmed",
      effectiveDate: { $lte: asOfDate },
    };
    const txnIds = await txnCollection
      .find(txnFilter, { projection: { _id: 1 } })
      .toArray();

    const details = await detailCollection
      .find({
        transaction: { $in: txnIds.map((t) => t._id) },
        account: { $in: accountDocs.map((a) => a._id) },
      })
      .toArray();

    const accountsWithBalance = accountDocs.map((a) => {
      const balance = details
        .filter((d) => d.account.toString() === a._id.toString())
        .reduce((sum, d) => {
          if (node.position === "Db") return sum + (d.position === "Db" ? d.amount : -d.amount);
          return sum + (d.position === "Cr" ? d.amount : -d.amount);
        }, 0);
      return { number: a.number, name: a.name, balance };
    });

    const accountsTotal = accountsWithBalance.reduce((s, a) => s + a.balance, 0);
    const childrenTotal = children.reduce((s, c) => s + c.total, 0);

    result.push({
      _id: node._id.toString(),
      code: node.code,
      name: node.name,
      children,
      accounts: accountsWithBalance,
      total: accountsTotal + childrenTotal,
    });
  }

  return result;
}

export async function GET(request: NextRequest) {
  try {
    const session = await verifyApiKey(request);
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const asOfDate = new Date(dateStr);

    const assets = await buildTree(null, ["Asset"], asOfDate);
    const liabilities = await buildTree(null, ["Liability"], asOfDate);
    const equity = await buildTree(null, ["Equity"], asOfDate);

    // Compute net income
    const db = await getDb();
    const startOfYear = new Date(asOfDate.getFullYear(), 0, 1);
    const incomeFilter: Record<string, unknown> = {
      status: "Confirmed",
      effectiveDate: { $gte: startOfYear, $lte: asOfDate },
    };
    const incomeTxnIds = await db
      .collection<Transaction>("accountingTransactions")
      .find(incomeFilter, { projection: { _id: 1 } })
      .toArray();

    const revenueAccounts = await db
      .collection<ChartOfAccount>("accountingCoa")
      .find({ category: { $in: ["Revenue", "COGS", "Expense"] }, isActive: true })
      .project({ _id: 1, category: 1, position: 1 })
      .toArray();

    const revenueAccountIds = revenueAccounts.map((r) => r._id);
    const revenueDetailAccounts = await db
      .collection<Account>("accountingAccounts")
      .find({ coa: { $in: revenueAccountIds }, isActive: true })
      .project({ _id: 1, coa: 1 })
      .toArray();

    const allDetails = await db
      .collection<TransactionDetail>("accountingTransactionDetails")
      .find({
        transaction: { $in: incomeTxnIds.map((t) => t._id) },
        account: { $in: revenueDetailAccounts.map((a) => a._id) },
      })
      .toArray();

    const coaMap = new Map<string, string>();
    const coaPosMap = new Map<string, string>();
    for (const r of revenueAccounts) {
      coaMap.set(r._id.toString(), r.category);
      coaPosMap.set(r._id.toString(), r.position);
    }

    const accountCoaMap = new Map<string, string>();
    for (const a of revenueDetailAccounts) {
      accountCoaMap.set(a._id.toString(), a.coa.toString());
    }

    let revenueTotal = 0;
    let cogsTotal = 0;
    let expenseTotal = 0;

    for (const d of allDetails) {
      const coaId = accountCoaMap.get(d.account.toString());
      const cat = coaId ? coaMap.get(coaId) : "";
      const pos = coaId ? coaPosMap.get(coaId) : "Cr";
      const contribution = pos === "Db"
        ? (d.position === "Db" ? d.amount : -d.amount)
        : (d.position === "Cr" ? d.amount : -d.amount);

      if (cat === "Revenue") revenueTotal += contribution;
      else if (cat === "COGS") cogsTotal += contribution;
      else if (cat === "Expense") expenseTotal += contribution;
    }

    const netIncome = revenueTotal - cogsTotal - expenseTotal;

    const wrapSection = (children: TreeNode[], name: string, id: string): TreeNode => ({
      _id: id,
      code: "",
      name: name.toUpperCase(),
      children,
      accounts: [],
      total: children.reduce((s, n) => s + n.total, 0),
    });

    return Response.json({
      asOfDate: dateStr,
      assets: wrapSection(assets, "Asset", "Asset"),
      liabilities: wrapSection(liabilities, "Liability", "Liability"),
      equity: wrapSection(equity, "Equity", "Equity"),
      netIncome,
    });
  } catch (error) {
    console.error("v1 balance-sheet GET error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
