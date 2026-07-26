import { getDb } from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { signToken, COOKIE_NAME, COOKIE_OPTIONS, getCookieMaxAge } from "@/lib/auth";
import { createNotification } from "@/lib/notification";
import { logAction, logError } from "@/lib/log";
import { rateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import type { SystemUser } from "@/lib/models";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = rateLimit(`signin:${ip}`, RATE_LIMITS.signin);
  if (!rl.success) return rateLimitResponse(rl.resetMs);

  try {
    const body = await request.json();
    const { identifier, password, rememberMe } = body;

    if (!identifier || !password) {
      return Response.json(
        { error: "All fields are required." },
        { status: 400 }
      );
    }

    const trimmedIdentifier = identifier.trim().toLowerCase();

    const db = await getDb();
    const collection = db.collection<SystemUser>("systemUsers");

    const user = await collection.findOne({
      $or: [
        { username: trimmedIdentifier },
        { email: trimmedIdentifier },
      ],
    });

    if (!user) {
      return Response.json(
        { error: "Invalid credentials." },
        { status: 401 }
      );
    }

    if (!user.emailVerified) {
      return Response.json(
        { error: "Please verify your email before signing in." },
        { status: 403 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      await logAction({
        userId: user._id,
        username: user.username,
        action: "LOGIN_FAILED",
        category: "AUTH",
        target: `user:${user.username}`,
        detail: "Invalid password",
        level: "WARN",
      });
      return Response.json(
        { error: "Invalid credentials." },
        { status: 401 }
      );
    }

    if (user.isActive === false) {
      await logAction({
        userId: user._id,
        username: user.username,
        action: "LOGIN_FAILED",
        category: "AUTH",
        target: `user:${user.username}`,
        detail: "Account disabled",
        level: "WARN",
      });
      return Response.json(
        { error: "Your account has been disabled. Please contact your administrator." },
        { status: 403 }
      );
    }

    let roleUrls: string[] = [];
    let roleIds: string[] = [];
    if (user.groupId) {
      const groupDoc = await db.collection("systemGroups").findOne({ _id: user.groupId });
      if (groupDoc && groupDoc.isActive === false) {
        return Response.json(
          { error: "Your account has been disabled. Please contact your administrator." },
          { status: 403 }
        );
      }
      const joins = await db.collection("systemGroupHasRole").find({ groupId: user.groupId }).toArray();
      const joinedRoleIds = joins.map((j) => j.roleId);
      roleIds = joinedRoleIds.map((id) => id.toString());
      if (joinedRoleIds.length > 0) {
        const roleDocList = await db.collection("systemRoles").find({ _id: { $in: joinedRoleIds } }).toArray();
        roleUrls = roleDocList.filter((r) => r.url).map((r) => r.url);
      }
    }

    const tz = user.timezone || "Asia/Jakarta";
    const lang = user.language || "en_US";

    const token = await signToken({
      userId: user._id.toString(),
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      timezone: tz,
      language: lang,
      roleUrls,
      roleIds,
    }, rememberMe === true);

    const secureFlag = COOKIE_OPTIONS.secure ? "; Secure" : "";
    const maxAge = getCookieMaxAge(rememberMe === true);

    await logAction({
      userId: user._id,
      username: user.username,
      action: "LOGIN",
      category: "AUTH",
      target: `user:${user.username}`,
      detail: "Signed in successfully",
    });

    await createNotification({
      userId: user._id.toString(),
      type: "INFO",
      title: "New sign-in",
      message: `Signed in from ${ip}`,
    });

    return Response.json(
      {
        message: "Signed in successfully.",
        user: {
          username: user.username,
          fullName: user.fullName,
          email: user.email,
        },
      },
      {
        headers: [
          ["Set-Cookie", `${COOKIE_NAME}=${token}; HttpOnly${secureFlag}; SameSite=${COOKIE_OPTIONS.sameSite}; Path=${COOKIE_OPTIONS.path}; Max-Age=${maxAge}`],
          ["Set-Cookie", `tz=${tz}${secureFlag}; SameSite=${COOKIE_OPTIONS.sameSite}; Path=/; Max-Age=${maxAge}`],
          ["Set-Cookie", `session_active=1; SameSite=${COOKIE_OPTIONS.sameSite}; Path=/; Max-Age=${maxAge}`],
        ],
      }
    );
  } catch (error) {
    console.error("Signin error:", error);
    await logError(request, "LOGIN", "auth:signin", error, "AUTH");
    return Response.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
