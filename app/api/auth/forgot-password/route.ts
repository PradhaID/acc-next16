import { getDb } from "@/lib/mongodb";
import { generateOtp, storeOtp, storePhoneOtp } from "@/lib/otp";
import { sendPasswordResetEmail } from "@/lib/email";
import { sendWhatsAppOtp } from "@/lib/waha";
import { getSetting } from "@/lib/settings";
import { logAction, logError } from "@/lib/log";
import { rateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = rateLimit(`otp:${ip}`, RATE_LIMITS.otp);
  if (!rl.success) return rateLimitResponse(rl.resetMs);

  try {
    const body = await request.json();
    const { identifier, method } = body;

    if (!identifier) {
      return Response.json({ error: "Email or phone number is required." }, { status: 400 });
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
      // Don't reveal if user exists
      return Response.json({ message: "If an account exists, a verification code has been sent." }, { status: 200 });
    }

    const otp = generateOtp();

    if (method === "whatsapp" && user.phone) {
      const waResult = await sendWhatsAppOtp(user.phone, otp);
      if (!waResult.success) {
        return Response.json({ error: waResult.error || "Failed to send WhatsApp OTP." }, { status: 500 });
      }
      await storePhoneOtp(user.phone, otp);
    } else if (user.email) {
      await storeOtp(user.email, otp);
      await sendPasswordResetEmail(user.email, otp);
    } else {
      return Response.json({ error: "No valid delivery method available for this account." }, { status: 400 });
    }

    await logAction({
      userId: user._id,
      username: user.username,
      action: "FORGOT_PASSWORD",
      category: "AUTH",
      target: `user:${user.username}`,
      detail: `OTP sent via ${method === "whatsapp" ? "WhatsApp" : "email"}`,
    });

    return Response.json({
      message: "If an account exists, a verification code has been sent.",
      identifier: trimmed,
      method: method === "whatsapp" && user.phone ? "whatsapp" : "email",
    }, { status: 200 });
  } catch (error) {
    console.error("Forgot password error:", error);
    await logError(request, "FORGOT_PASSWORD", "auth:forgot-password", error, "AUTH");
    return Response.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
