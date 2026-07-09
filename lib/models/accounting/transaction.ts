import { ObjectId } from "mongodb";

export type TransactionStatus = "Pending" | "Confirmed" | "Rejected" | "Reversed" | "Canceled";

export interface EvidenceItem {
  url: string;
  description?: string;
}

export interface Transaction {
  _id: ObjectId;
  code: string;
  effectiveDate: Date;
  reference?: string;
  information?: string;
  amount: number;
  evidence: EvidenceItem[];
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
