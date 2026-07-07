import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOtpEmail(
  email: string,
  otp: string
): Promise<void> {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Your verification code",
    text: `Your verification code is: ${otp}\n\nThis code expires in 10 minutes.`,
    html: `<p>Your verification code is: <strong>${otp}</strong></p><p>This code expires in 10 minutes.</p>`,
  });
}
