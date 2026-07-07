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
  category: CoaCategory,
  startDate: Date,
  endDate: Date
): Promise<TreeNode[]> {
  const db = await getDb();
  const coaCollection = db.collection<ChartOfAccount>("accountingCoa");
  const accountCollection = db.collection<Account>("accountingAccounts");
  const txnCollection = db.collection<Transaction>("accountingTransactions");
  const detailCollection = db.collection<TransactionDetail>("accountingTransactionDetails");

  const nodes = await coaCollection
    .find({ parent: parentId ? new ObjectId(parentId) : null, category, isActive: true })
    .sort({ code: 1 })
    .toArray();

  const result: TreeNode[] = [];

  for (const node of nodes) {
    const children = await buildTree(node._id.toString(), category, startDate, endDate);

    const accountDocs = await accountCollection
      .find({ coa: node._id, isActive: true })
      .sort({ number: 1 })
      .toArray();

    const txnFilter: Record<string, unknown> = {
      status: "Confirmed",
      effectiveDate: { $gte: startDate, $lte: endDate },
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
    const now = new Date();
    const startDateStr = searchParams.get("startDate") || `${now.getFullYear()}-01-01`;
    const endDateStr = searchParams.get("endDate") || now.toISOString().split("T")[0];

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    const revenue = await buildTree(null, "Revenue", startDate, endDate);
    const cogs = await buildTree(null, "COGS", startDate, endDate);
    const expenses = await buildTree(null, "Expense", startDate, endDate);

    const sumTotal = (nodes: TreeNode[]): number => nodes.reduce((s, n) => s + n.total, 0);
    const revenueTotal = sumTotal(revenue);
    const cogsTotal = sumTotal(cogs);
    const expensesTotal = sumTotal(expenses);

    return Response.json({
      startDate: startDateStr,
      endDate: endDateStr,
      revenue: { total: revenueTotal, children: revenue },
      cogs: { total: cogsTotal, children: cogs },
      expenses: { total: expensesTotal, children: expenses },
      grossProfit: revenueTotal - cogsTotal,
      netProfit: revenueTotal - cogsTotal - expensesTotal,
    });
  } catch (error) {
    console.error("v1 income-statement GET error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
