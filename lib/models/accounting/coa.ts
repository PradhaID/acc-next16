import { ObjectId } from "mongodb";

export type CoaCategory = "Asset" | "Liability" | "Equity" | "Revenue" | "COGS" | "Expense";
export type CoaPosition = "Db" | "Cr";

export interface ChartOfAccount {
  _id: ObjectId;
  parent: ObjectId | null;
  code: string;
  name: string;
  description?: string;
  position: CoaPosition;
  category: CoaCategory;
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
