import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { generateOtp, storeOtp } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";
import type { SystemUser } from "@/lib/models";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, fullName, email, password } = body;

    if (!username || !fullName || !email || !password) {
      return Response.json(
        { error: "All fields are required." },
        { status: 400 }
      );
    }

    const trimmedUsername = username.trim().toLowerCase();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedFullName = fullName.trim();

    if (/\s/.test(trimmedUsername)) {
      return Response.json(
        { error: "Username must not contain spaces." },
        { status: 400 }
      );
    }

    if (trimmedUsername.length < 3) {
      return Response.json(
        { error: "Username must be at least 3 characters." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return Response.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return Response.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const db = await getDb();
    const collection = db.collection<SystemUser>("systemUsers");

    await collection.createIndex({ username: 1 }, { unique: true });
    await collection.createIndex({ email: 1 }, { unique: true });

    const existingUser = await collection.findOne({
      $or: [{ username: trimmedUsername }, { email: trimmedEmail }],
    });

    if (existingUser) {
      if (existingUser.username === trimmedUsername) {
        return Response.json(
          { error: "Username is already taken." },
          { status: 409 }
        );
      }
      if (existingUser.email === trimmedEmail) {
        return Response.json(
          { error: "Email is already registered." },
          { status: 409 }
        );
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const now = new Date();
    const _id = new ObjectId();

    await collection.insertOne({
      _id,
      username: trimmedUsername,
      fullName: trimmedFullName,
      email: trimmedEmail,
      password: hashedPassword,
      emailVerified: false,
      groupId: null,
      timezone: "Asia/Jakarta",
      created: { at: now, by: null },
      updated: { at: now, by: _id },
    });

    // Generate and send OTP
    const otp = generateOtp();
    await storeOtp(trimmedEmail, otp);
    await sendOtpEmail(trimmedEmail, otp);

    return Response.json(
      {
        message: "Account created successfully.",
        redirectUrl: `/account/verify-otp?email=${encodeURIComponent(trimmedEmail)}`,
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as unknown as { code: number }).code === 11000
    ) {
      return Response.json(
        { error: "Username or email is already taken." },
        { status: 409 }
      );
    }

    console.error("Signup error:", error);
    return Response.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
