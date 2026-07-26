import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export interface SessionPayload extends JWTPayload {
  userId: string;
  username: string;
  fullName: string;
  email: string;
  timezone: string;
  language: string;
  roleUrls: string[];
  roleIds: string[];
}

export async function signToken(payload: SessionPayload, rememberMe = false): Promise<string> {
  const rest: Partial<SessionPayload> = { ...payload };
  delete rest.roleUrls;
  delete rest.roleIds;
  return new SignJWT(rest)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(rememberMe ? "30d" : "7d")
    .sign(secret);
}

export async function verifyToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string;
    if (!userId) return null;

    const db = await getDb();
    const user = await db.collection("systemUsers").findOne({ _id: new ObjectId(userId) });
    if (!user || user.isActive === false) return null;

    let roleUrls: string[] = [];
    let roleIds: string[] = [];

    if (user.groupId) {
      const groupDoc = await db.collection("systemGroups").findOne({ _id: user.groupId });
      if (groupDoc && groupDoc.isActive !== false) {
        const joins = await db.collection("systemGroupHasRole").find({ groupId: user.groupId }).toArray();
        const joinedRoleIds = joins.map((j) => j.roleId);
        roleIds = joinedRoleIds.map((id) => id.toString());
        if (joinedRoleIds.length > 0) {
          const roleDocList = await db.collection("systemRoles").find({ _id: { $in: roleIds as unknown as ObjectId[] } }).toArray();
          roleUrls = roleDocList.filter((r) => r.url).map((r) => r.url);
        }
      }
    }

    return {
      userId: payload.userId as string,
      username: payload.username as string,
      fullName: payload.fullName as string,
      email: payload.email as string,
      timezone: payload.timezone as string,
      language: payload.language as string,
      roleUrls,
      roleIds,
    };
  } catch (error) {
    console.error("verifyToken error:", error);
    return null;
  }
}

export const COOKIE_NAME = "token";

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

export function getCookieMaxAge(rememberMe = false): number {
  return rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7;
}
