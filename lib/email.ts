import nodemailer from "nodemailer";
import { otpTemplate } from "./email-templates/otp";
import { passwordResetTemplate } from "./email-templates/password-reset";
import { welcomeTemplate } from "./email-templates/welcome";
import { passwordChangedTemplate } from "./email-templates/password-changed";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<void> {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html,
    text,
  });
}

export async function sendOtpEmail(email: string, otp: string): Promise<void> {
  const { html, text, title } = await otpTemplate({ email, otp, purpose: "signup" });
  await sendEmail({ to: email, subject: title, html, text });
}

export async function sendResendOtpEmail(email: string, otp: string): Promise<void> {
  const { html, text, title } = await otpTemplate({ email, otp, purpose: "resend" });
  await sendEmail({ to: email, subject: title, html, text });
}

export async function sendPasswordResetEmail(email: string, otp: string): Promise<void> {
  const { html, text, title } = await passwordResetTemplate({ email, otp });
  await sendEmail({ to: email, subject: title, html, text });
}

export async function sendWelcomeEmail(email: string, fullName: string): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const { html, text, title } = await welcomeTemplate({ fullName, email, appUrl });
  await sendEmail({ to: email, subject: title, html, text });
}

export async function sendPasswordChangedEmail(email: string, fullName: string): Promise<void> {
  const { html, text, title } = await passwordChangedTemplate({ fullName, email, timestamp: new Date() });
  await sendEmail({ to: email, subject: title, html, text });
}
