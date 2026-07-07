import { getClient } from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await getClient();
    // Ping the database to verify the connection is alive
    await client.db().command({ ping: 1 });

    return Response.json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown database error";

    return Response.json(
      { status: "error", database: "disconnected", error: message },
      { status: 500 }
    );
  }
}
