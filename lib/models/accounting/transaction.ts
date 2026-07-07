import { ObjectId } from "mongodb";

export type TransactionStatus = "Pending" | "Confirmed" | "Rejected" | "Reversed";

export interface Transaction {
  _id: ObjectId;
  code: string;
  effectiveDate: Date;
  reference?: string;
  information?: string;
  amount: number;
  evidence: string[];
  status: TransactionStatus;
  source: "api" | "ui";
  created: {
    at: Date;
    by: ObjectId | null;
  };
  updated: {
    at: Date;
    by: ObjectId | null;
  };
  confirmed?: {
    at: Date;
    by: ObjectId | null;
  };
  rejected?: {
    at: Date;
    by: ObjectId | null;
  };
  reversed?: {
    at: Date;
    by: ObjectId | null;
  };
}
