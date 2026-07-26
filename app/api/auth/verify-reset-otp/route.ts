import { NextRequest } from "next/server";
import { getDb } from "@/lib/mongodb";
import { verifyOtp, verifyPhoneOtp } from "@/lib/otp";
import { logAction, logError } from "@/lib/log";
import { rateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = rateLimit(`otp:${ip}`, RATE_LIMITS.otp);
  if (!rl.success) return rateLimitResponse(rl.resetMs);

  try {
    const body = await request.json();
    const { identifier, otp, method } = body;

    if (!identifier || !otp) {
      return Response.json({ error: "Identifier and OTP are required." }, { status: 400 });
    }

    const raw = identifier.trim();
    const trimmed = raw.toLowerCase();
    const trimmedDigits = raw.replace(/[^\d]/g, "");

    const db = await getDb();
    const users = db.collection("systemUsers");

    const user = await users.findOne({
      $or: [{ email: trimmed }, { phone: trimmed }, { phone: trimmedDigits }],
    });

    if (!user) {
      return Response.json({ error: "Account not found." }, { status: 404 });
    }

    const isPhone = method === "whatsapp";

    let isVerified = false;
    if (isPhone && user.phone) {
      isVerified = await verifyPhoneOtp(user.phone, otp);
    } else if (user.email) {
      isVerified = await verifyOtp(user.email, otp);
    }

    if (!isVerified) {
      return Response.json({ error: "Invalid or expired verification code." }, { status: 400 });
    }

    const token = require("crypto").randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await db.collection("passwordResets").updateOne(
      { userId: user._id },
      { $set: { token, expires, createdAt: new Date() } },
      { upsert: true }
    );

    await logAction({
      userId: user._id,
      username: user.username,
      action: "VERIFY_RESET_OTP",
      category: "AUTH",
      target: `user:${user.username}`,
      detail: `OTP verified for password reset`,
    });

    return Response.json({ token, message: "OTP verified. You can now set a new password." }, { status: 200 });
  } catch (error) {
    console.error("Verify reset OTP error:", error);
    await logError(request, "VERIFY_RESET_OTP", "auth:verify-reset-otp", error, "AUTH");
    return Response.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
