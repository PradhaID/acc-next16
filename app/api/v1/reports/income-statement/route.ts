import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { verifyApiKey } from "@/lib/api-auth";
import type { ChartOfAccount, Account, Transaction, TransactionDetail, CoaCategory } from "@/lib/models";

interface CoaNode {
  _id: string;
  code: string;
  name: string;
  position: "Db" | "Cr";
  category: string;
  parent: string | null;
  children: CoaNode[];
  total: number;
}

async function buildTree(
  parentId: string | null,
  category: CoaCategory,
  startDate: Date,
  endDate: Date
): Promise<CoaNode[]> {
  const db = await getDb();
  const coaCollection = db.collection<ChartOfAccount>("accountingCoa");
  const accountCollection = db.collection<Account>("accountingAccounts");
  const txnCollection = db.collection<Transaction>("accountingTransactions");
  const detailCollection = db.collection<TransactionDetail>("accountingTransactionDetails");

  const nodes = await coaCollection
    .find({ parent: parentId ? new ObjectId(parentId) : null, category, isActive: true })
    .sort({ code: 1 })
    .toArray();

  const result: CoaNode[] = [];

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

    const total = details
      .filter((d) => accountDocs.some((a) => a._id.toString() === d.account.toString()))
      .reduce((sum, d) => {
        if (node.position === "Db") return sum + (d.position === "Db" ? d.amount : -d.amount);
        return sum + (d.position === "Cr" ? d.amount : -d.amount);
      }, 0);

    const childrenTotal = children.reduce((s, c) => s + c.total, 0);

    result.push({
      _id: node._id.toString(),
      code: node.code,
      name: node.name,
      position: node.position as "Db" | "Cr",
      category,
      parent: node.parent ? node.parent.toString() : null,
      children,
      total: total + childrenTotal,
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
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : new Date(now.getFullYear(), 0, 1);
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const revenue = await buildTree(null, "Revenue", startDate, endDate);
    const cogs = await buildTree(null, "COGS", startDate, endDate);
    const expenses = await buildTree(null, "Expense", startDate, endDate);

    const wrapSection = (children: CoaNode[], name: string, id: string, position: "Db" | "Cr", category: string): CoaNode => ({
      _id: id,
      code: "",
      name: name.toUpperCase(),
      position,
      category,
      parent: null,
      children,
      total: children.reduce((s, n) => s + n.total, 0),
    });

    const revenueNode = wrapSection(revenue, "Revenue", "Revenue", "Cr", "Revenue");
    const cogsNode = wrapSection(cogs, "COGS", "COGS", "Db", "COGS");
    const expensesNode = wrapSection(expenses, "Expense", "Expense", "Db", "Expense");

    return Response.json({
      startDate,
      endDate,
      revenue: revenueNode,
      cogs: cogsNode,
      expenses: expensesNode,
      grossProfit: revenueNode.total - cogsNode.total,
      netProfit: revenueNode.total - cogsNode.total - expensesNode.total,
    });
  } catch (error) {
    console.error("v1 income-statement GET error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
