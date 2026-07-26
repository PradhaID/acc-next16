import { ObjectId } from "mongodb";

export type RedirectType = "301" | "302" | "308";

export interface RedirectRule {
  _id: ObjectId;
  from: string;
  to: string;
  type: RedirectType;
  isPattern: boolean;
  isActive: boolean;
  hitCount: number;
  created: { at: Date; by: ObjectId };
  updated: { at: Date; by: ObjectId };
}

export interface RedirectLog {
  _id: ObjectId;
  url: string;
  referrer?: string;
  userAgent?: string;
  created: { at: Date };
}
