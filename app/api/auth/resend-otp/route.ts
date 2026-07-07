import { generateOtp, storeOtp } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";

export async function POST(request: Request) {
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
    await sendOtpEmail(trimmedEmail, otp);

    return Response.json(
      { message: "A new verification code has been sent." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Resend OTP error:", error);
    return Response.json(
      { error: "Failed to resend OTP. Please try again." },
      { status: 500 }
    );
  }
}
