import { generateOtp, storeOtp } from "@/lib/otp";
import { sendResendOtpEmail } from "@/lib/email";
import { rateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { logAction, logError } from "@/lib/log";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = rateLimit(`otp:${ip}`, RATE_LIMITS.otp);
  if (!rl.success) return rateLimitResponse(rl.resetMs);

  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return Response.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const otp = generateOtp();

    await storeOtp(trimmedEmail, otp);
    await sendResendOtpEmail(trimmedEmail, otp);

    await logAction({
      userId: "000000000000000000000000",
      username: trimmedEmail,
      action: "RESEND_OTP",
      category: "AUTH",
      target: `user:${trimmedEmail}`,
      ip,
    });

    return Response.json(
      { message: "A new verification code has been sent." },
      { status: 200 }
    );
  } catch (error) {
    await logError(request, "RESEND_OTP", "auth:otp", error, "AUTH");
    return Response.json(
      { error: "Failed to resend OTP. Please try again." },
      { status: 500 }
    );
  }
}
