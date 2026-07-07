import { ObjectId } from "mongodb";

export interface EmailOtp {
  _id: ObjectId;
  email: string;
  otpHash: string;
  expiresAt: Date;
  createdAt: Date;
}
