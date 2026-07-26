import { baseTemplate } from "./base";

interface PasswordResetTemplateOptions {
  email: string;
  otp: string;
}

export async function passwordResetTemplate({ email, otp }: PasswordResetTemplateOptions) {
  const title = "Password Reset Request";
  const preheader = `Your password reset code is ${otp}`;

  const body = `
    <p class="message">Hello,</p>
    <p class="message">
      We received a request to reset the password for <strong>${email}</strong>.
    </p>

    <div class="otp-box">
      <p class="otp-label">Your reset code</p>
      <p class="otp-code">${otp}</p>
    </div>

    <div class="warning">
      <p><strong>This code expires in 10 minutes.</strong> If you didn't request a password reset, you can safely ignore this email &mdash; your password will remain unchanged.</p>
    </div>

    <hr class="divider" />

    <p class="message" style="color:#78716c;font-size:13px">
      For security, never share this code with anyone. Our team will never ask for it.
    </p>
  `;

  return baseTemplate({ title, preheader, body });
}
