import { verifyApiKey } from "@/lib/api-auth";

export async function GET(request: Request) {
  try {
    const session = await verifyApiKey(request);
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const types = {
      General: "GJ",
      FundTransfer: "FT",
      Expense: "EX",
      Revenue: "RV",
      Purchase: "PC",
      Sales: "SL",
      Payroll: "PR",
      Tax: "TX",
      Depreciation: "DP",
      Closing: "CE",
    };

    return Response.json(types);
  } catch (error) {
    console.error("v1 transaction-types GET error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
