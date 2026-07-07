import { getDb } from "@/lib/mongodb";
import { verifyOtp } from "@/lib/otp";
import { signToken, COOKIE_NAME, COOKIE_OPTIONS } from "@/lib/auth";
import type { SystemUser } from "@/lib/models";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, otp } = body;

    if (!email || !otp) {
      return Response.json(
        { error: "Email and OTP are required." },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedOtp = otp.trim();

    if (trimmedOtp.length < 4 || trimmedOtp.length > 6) {
      return Response.json(
        { error: "Invalid OTP format." },
        { status: 400 }
      );
    }

    const isValid = await verifyOtp(trimmedEmail, trimmedOtp);

    if (!isValid) {
      return Response.json(
        { error: "Invalid or expired OTP." },
        { status: 400 }
      );
    }

    const db = await getDb();
    const users = db.collection<SystemUser>("systemUsers");

    const user = await users.findOne({ email: trimmedEmail });

    if (!user) {
      return Response.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    await users.updateOne(
      { email: trimmedEmail },
      {
        $set: {
          emailVerified: true,
          updated: { at: new Date(), by: user._id },
        },
      }
    );

    let roleUrls: string[] = [];
    let roleIds: string[] = [];
    if (user.groupId) {
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

    return Response.json(
      {
        message: "Email verified successfully.",
        user: {
          username: user.username,
          fullName: user.fullName,
          email: user.email,
        },
      },
      {
        status: 200,
        headers: [
          ["Set-Cookie", `${COOKIE_NAME}=${token}; HttpOnly; Secure=${COOKIE_OPTIONS.secure}; SameSite=${COOKIE_OPTIONS.sameSite}; Path=${COOKIE_OPTIONS.path}; Max-Age=${COOKIE_OPTIONS.maxAge}`],
          ["Set-Cookie", `tz=${tz}; Secure=${COOKIE_OPTIONS.secure}; SameSite=${COOKIE_OPTIONS.sameSite}; Path=/; Max-Age=${COOKIE_OPTIONS.maxAge}`],
        ],
      }
    );
  } catch (error) {
    console.error("Verify OTP error:", error);
    return Response.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
