import { ObjectId } from "mongodb";

export interface SystemUser {
  _id: ObjectId;
  username: string;
  fullName: string;
  email: string;
  phone?: string | null;
  image?: string | null;
  password: string;
  emailVerified: boolean;
  groupId: ObjectId | null;
  timezone: string;
  language: string;
  biography?: string;
  isActive?: boolean;
  apiKey?: string;
  created: {
    at: Date;
    by: ObjectId | null;
  };
  updated: {
    at: Date;
    by: ObjectId;
  };
}
