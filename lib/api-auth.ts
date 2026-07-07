import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { SystemUser } from "@/lib/models";

export interface ApiKeySession {
  userId: string;
  username: string;
  fullName: string;
}

export async function verifyApiKey(request: Request): Promise<ApiKeySession | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const apiKey = authHeader.slice(7).trim();
  if (!apiKey) return null;

  const db = await getDb();
  const user = await db.collection<SystemUser>("systemUsers").findOne(
    { apiKey, isActive: { $ne: false } },
    { projection: { _id: 1, username: 1, fullName: 1 } }
  );

  if (!user) return null;

  return {
    userId: user._id.toString(),
    username: user.username,
    fullName: user.fullName,
  };
}
