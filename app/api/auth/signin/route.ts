import { getDb } from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { signToken, COOKIE_NAME, COOKIE_OPTIONS } from "@/lib/auth";
import type { SystemUser } from "@/lib/models";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier, password } = body;

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
      return Response.json(
        { error: "Invalid credentials." },
        { status: 401 }
      );
    }

    if (user.isActive === false) {
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

    const token = await signToken({
      userId: user._id.toString(),
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      timezone: tz,
      roleUrls,
      roleIds,
    });

    const secureFlag = COOKIE_OPTIONS.secure ? "; Secure" : "";

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
          ["Set-Cookie", `${COOKIE_NAME}=${token}; HttpOnly${secureFlag}; SameSite=${COOKIE_OPTIONS.sameSite}; Path=${COOKIE_OPTIONS.path}; Max-Age=${COOKIE_OPTIONS.maxAge}`],
          ["Set-Cookie", `tz=${tz}${secureFlag}; SameSite=${COOKIE_OPTIONS.sameSite}; Path=/; Max-Age=${COOKIE_OPTIONS.maxAge}`],
        ],
      }
    );
  } catch (error) {
    console.error("Signin error:", error);
    return Response.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
