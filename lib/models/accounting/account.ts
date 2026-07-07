import { ObjectId } from "mongodb";

export interface Account {
  _id: ObjectId;
  coa: ObjectId;
  number: string;
  name: string;
  description?: string;
  balance: number;
  isActive: boolean;
  created: {
    at: Date;
    by: ObjectId | null;
  };
  updated: {
    at: Date;
    by: ObjectId | null;
  };
}
