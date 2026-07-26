import { NextRequest } from "next/server";
import { getDb } from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { logAction, logError } from "@/lib/log";
import { rateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = rateLimit(`password:${ip}`, RATE_LIMITS.password);
  if (!rl.success) return rateLimitResponse(rl.resetMs);

  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return Response.json({ error: "Token and new password are required." }, { status: 400 });
    }

    if (password.length < 6) {
      return Response.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const db = await getDb();
    const resets = db.collection("passwordResets");
    const users = db.collection("systemUsers");

    const record = await resets.findOne({ token });
    if (!record) {
      return Response.json({ error: "Invalid or expired reset token." }, { status: 400 });
    }

    if (new Date() > record.expires) {
      await resets.deleteOne({ token });
      return Response.json({ error: "Reset token has expired. Please request a new one." }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await users.updateOne(
      { _id: record.userId },
      { $set: { password: hashedPassword, updated: { at: new Date(), by: record.userId } } }
    );

    await resets.deleteOne({ token });

    const user = await users.findOne({ _id: record.userId });
    await logAction({
      userId: record.userId,
      username: user?.username || "unknown",
      action: "RESET_PASSWORD",
      category: "AUTH",
      target: `user:${user?.username || "unknown"}`,
      detail: "Password reset via OTP",
    });

    return Response.json({ message: "Password has been reset successfully. You can now sign in." }, { status: 200 });
  } catch (error) {
    console.error("Reset password error:", error);
    await logError(request, "RESET_PASSWORD", "auth:reset-password", error, "AUTH");
    return Response.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
