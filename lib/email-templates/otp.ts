import { baseTemplate } from "./base";

interface OtpTemplateOptions {
  email: string;
  otp: string;
  purpose: "signup" | "verify" | "resend";
}

export async function otpTemplate({ email, otp, purpose }: OtpTemplateOptions) {
  const title = purpose === "signup" ? "Verify your email" : "Your verification code";
  const preheader = `Your verification code is ${otp}`;

  const body = `
    <p class="message">Hello,</p>
    <p class="message">
      ${purpose === "signup"
        ? `Welcome! Please verify your email address <strong>${email}</strong> to get started.`
        : purpose === "resend"
          ? `Here's a new verification code for <strong>${email}</strong>.`
          : `Your verification code for <strong>${email}</strong> is below.`
      }
    </p>

    <div class="otp-box">
      <p class="otp-label">Your verification code</p>
      <p class="otp-code">${otp}</p>
    </div>

    <div class="warning">
      <p><strong>This code expires in 10 minutes.</strong> Do not share it with anyone. Our team will never ask for this code.</p>
    </div>

    <p class="message" style="color:#78716c;font-size:13px">
      If you didn't create an account, you can safely ignore this email.
    </p>
  `;

  return baseTemplate({ title, preheader, body });
}
