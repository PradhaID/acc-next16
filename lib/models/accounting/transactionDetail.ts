import { ObjectId } from "mongodb";

export type DetailPosition = "Db" | "Cr";

export interface TransactionDetail {
  _id: ObjectId;
  transaction: ObjectId;
  account: ObjectId;
  position: DetailPosition;
  amount: number;
}
