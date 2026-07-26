import { NextRequest } from "next/server";
import { getDb } from "@/lib/mongodb";
import type { SystemUser } from "@/lib/models";

export interface ApiKeySession {
  userId: string;
  username: string;
  fullName: string;
  email: string;
  timezone: string;
}

export async function verifyApiKey(request: NextRequest): Promise<ApiKeySession | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const apiKey = authHeader.slice(7);
  if (!apiKey || !apiKey.startsWith("ak_")) return null;

  const db = await getDb();
  const user = await db.collection<SystemUser>("systemUsers").findOne({ apiKey });

  if (!user || user.isActive === false) return null;

  return {
    userId: user._id.toString(),
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    timezone: user.timezone,
  };
}

export function apiUnauthorized() {
  return Response.json(
    { success: false, error: "Invalid or missing API key. Send via Authorization: Bearer ak_xxx" },
    { status: 401 }
  );
}
