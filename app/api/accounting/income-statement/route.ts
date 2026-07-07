import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import type { Account, ChartOfAccount } from "@/lib/models";

interface CoaNode {
  _id: string;
  code: string;
  name: string;
  position: string;
  category: string;
  parent: string | null;
  children: CoaNode[];
  total: number;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();

    const db = await getDb();

    const allCoas = (await db
      .collection("accountingCoa")
      .find({ category: { $in: ["Revenue", "COGS", "Expense"] } })
      .sort({ code: 1 })
      .toArray()) as ChartOfAccount[];

    const coaMap = new Map(allCoas.map((c) => [c._id.toHexString(), c]));

    const allAccounts = (await db
      .collection("accountingAccounts")
      .find({ isActive: true })
      .sort({ number: 1 })
      .toArray()) as Account[];

    // Aggregate period transactions by account
    const periodRows = await db
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
        {
          $match: {
            "txn.status": "Confirmed",
            "txn.effectiveDate": { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: "$account",
            totalDb: { $sum: { $cond: [{ $eq: ["$position", "Db"] }, "$amount", 0] } },
            totalCr: { $sum: { $cond: [{ $eq: ["$position", "Cr"] }, "$amount", 0] } },
          },
        },
      ])
      .toArray() as { _id: ObjectId; totalDb: number; totalCr: number }[];

    const periodBalances = new Map<string, { totalDb: number; totalCr: number }>();
    for (const r of periodRows) {
      periodBalances.set(r._id.toHexString(), { totalDb: r.totalDb, totalCr: r.totalCr });
    }

    // Build COA tree for a category, computing totals from accounts
    function buildTree(coas: ChartOfAccount[], parentId: string | null): CoaNode[] {
      return coas
        .filter((c) => {
          const pid = c.parent instanceof ObjectId ? c.parent.toHexString() : c.parent ? String(c.parent) : null;
          return pid === parentId;
        })
        .map((c) => {
          const children = buildTree(coas, c._id.toHexString());
          const childTotal = children.reduce((s, ch) => s + ch.total, 0);

          // Find accounts under this COA
          const cid = c._id.toHexString();
          const accs = allAccounts.filter((a) => {
            const aid = a.coa instanceof ObjectId ? a.coa.toHexString() : String(a.coa);
            return aid === cid;
          });

          let accTotal = 0;
          for (const acc of accs) {
            const bal = periodBalances.get(acc._id.toHexString());
            if (bal) {
              accTotal += c.position === "Db" ? bal.totalDb - bal.totalCr : bal.totalCr - bal.totalDb;
            }
          }

          return {
            _id: cid,
            code: c.code,
            name: c.name,
            position: c.position,
            category: c.category,
            parent: c.parent instanceof ObjectId ? c.parent.toHexString() : c.parent ? String(c.parent) : null,
            children,
            total: accTotal + childTotal,
          };
        });
    }

    function buildSection(category: string): CoaNode {
      const coas = allCoas.filter((c) => c.category === category);
      const children = buildTree(coas, null);
      return {
        _id: category,
        code: "",
        name: category.toUpperCase(),
        position: "Db",
        category,
        parent: null,
        children,
        total: children.reduce((s, c) => s + c.total, 0),
      };
    }

    const revenue = buildSection("Revenue");
    const cogs = buildSection("COGS");
    const expenses = buildSection("Expense");
    const grossProfit = revenue.total - cogs.total;

    return Response.json({
      startDate: start,
      endDate: end,
      revenue,
      cogs,
      expenses,
      grossProfit,
      netProfit: grossProfit - expenses.total,
    });
  } catch (error) {
    console.error("Income Statement GET error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
