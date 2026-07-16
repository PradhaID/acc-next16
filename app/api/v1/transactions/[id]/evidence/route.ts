import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { verifyApiKey } from "@/lib/api-auth";
import { errors } from "@/lib/api-error";
import type { Transaction } from "@/lib/models";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifyApiKey(request);
    if (!session) return errors.unauthorized();

    const { id } = await params;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const url = formData.get("url") as string | null;
    const description = formData.get("description") as string | null;

    if (!file && !url) return errors.validation("File or url is required.");

    const db = await getDb();
    const txn = await db.collection<Transaction>("accountingTransactions").findOne({ _id: new ObjectId(id) });
    if (!txn) return errors.notFound("Transaction not found");

    let fileUrl: string;
    if (file) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const fileName = `${Date.now()}-${safeName}`;
      const filePath = `public/uploads/evidence/${fileName}`;

      const fs = await import("fs/promises");
      await fs.mkdir("public/uploads/evidence", { recursive: true });
      await fs.writeFile(filePath, Buffer.from(await file.arrayBuffer()));

      fileUrl = `/uploads/evidence/${encodeURIComponent(fileName)}`;
    } else {
      const { downloadAndStore } = await import("@/lib/accounting/evidence");
      fileUrl = await downloadAndStore(url!);
    }
    const evidenceItem = { url: fileUrl, ...(description ? { description } : {}) };

    await db.collection<Transaction>("accountingTransactions").updateOne(
      { _id: new ObjectId(id) },
      {
        $push: { evidence: evidenceItem },
        $set: { updated: { at: new Date(), by: new ObjectId(session.userId) } },
      }
    );

    return Response.json(evidenceItem, { status: 201 });
  } catch (error) {
    console.error("v1 Evidence POST error:", error);
    return errors.internal();
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifyApiKey(request);
    if (!session) return errors.unauthorized();

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) return errors.validation("url query parameter is required.");

    const db = await getDb();
    const txn = await db.collection<Transaction>("accountingTransactions").findOne({ _id: new ObjectId(id) });
    if (!txn) return errors.notFound("Transaction not found");

    const fs = await import("fs/promises");
    const filePath = `public${url}`;
    try {
      await fs.unlink(filePath);
    } catch {
      // File may not exist, continue
    }

    await db.collection<Transaction>("accountingTransactions").updateOne(
      { _id: new ObjectId(id) },
      {
        $pull: { evidence: { url } },
        $set: { updated: { at: new Date(), by: new ObjectId(session.userId) } },
      }
    );

    return Response.json({ message: "Evidence removed." });
  } catch (error) {
    console.error("v1 Evidence DELETE error:", error);
    return errors.internal();
  }
}
