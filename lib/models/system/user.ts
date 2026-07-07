import { ObjectId } from "mongodb";

export interface SystemUser {
  _id: ObjectId;
  username: string;
  fullName: string;
  email: string;
  password: string;
  emailVerified: boolean;
  groupId: ObjectId | null;
  timezone: string;
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
