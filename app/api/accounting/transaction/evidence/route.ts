import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import type { Transaction } from "@/lib/models";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const transactionId = formData.get("transactionId") as string | null;
    const description = formData.get("description") as string | null;

    if (!file || !transactionId) {
      return Response.json({ error: "File and transactionId are required." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `${Date.now()}-${safeName}`;
    const filePath = `public/uploads/evidence/${fileName}`;

    const fs = await import("fs/promises");
    await fs.mkdir("public/uploads/evidence", { recursive: true });
    await fs.writeFile(filePath, buffer);

    const fileUrl = `/uploads/evidence/${encodeURIComponent(fileName)}`;
    const evidenceItem = { url: fileUrl, ...(description ? { description } : {}) };

    const db = await getDb();
    await db.collection<Transaction>("accountingTransactions").updateOne(
      { _id: new ObjectId(transactionId) },
      {
        $push: { evidence: evidenceItem },
        $set: { updated: { at: new Date(), by: new ObjectId(session.userId) } },
      }
    );

    return Response.json(evidenceItem, { status: 201 });
  } catch (error) {
    console.error("Evidence POST error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get("transactionId");
    const url = searchParams.get("url");

    if (!transactionId || !url) {
      return Response.json({ error: "transactionId and url are required." }, { status: 400 });
    }

    const fs = await import("fs/promises");
    const filePath = `public${url}`;
    try {
      await fs.unlink(filePath);
    } catch {
      // File may not exist, continue
    }

    const db = await getDb();
    await db.collection<Transaction>("accountingTransactions").updateOne(
      { _id: new ObjectId(transactionId) },
      {
        $pull: { evidence: { url } },
        $set: { updated: { at: new Date(), by: new ObjectId(session.userId) } },
      }
    );

    return Response.json({ message: "Removed." });
  } catch (error) {
    console.error("Evidence DELETE error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
