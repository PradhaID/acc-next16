import crypto from "node:crypto";
import { getDb } from "./mongodb";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;

export function generateOtp(): string {
  const digits = Array.from({ length: OTP_LENGTH }, () =>
    crypto.randomInt(0, 10)
  );
  return digits.join("");
}

export function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export async function storeOtp(
  email: string,
  otp: string
): Promise<void> {
  const db = await getDb();
  const collection = db.collection("emailOtps");

  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  const otpHash = hashOtp(otp);

  // Upsert so only one valid OTP per email at a time
  await collection.updateOne(
    { email },
    { $set: { otpHash, expiresAt, createdAt: new Date() } },
    { upsert: true }
  );
}

export async function verifyOtp(
  email: string,
  otp: string
): Promise<boolean> {
  const db = await getDb();
  const collection = db.collection("emailOtps");

  const record = await collection.findOne({ email });

  if (!record) return false;
  if (new Date() > record.expiresAt) {
    await collection.deleteOne({ email });
    return false;
  }

  const isMatch = hashOtp(otp) === record.otpHash;
  if (isMatch) {
    await collection.deleteOne({ email });
  }
  return isMatch;
}

export async function deleteOtp(email: string): Promise<void> {
  const db = await getDb();
  await db.collection("emailOtps").deleteOne({ email });
}
