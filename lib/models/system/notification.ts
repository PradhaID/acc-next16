import { ObjectId } from "mongodb";

export interface SystemNotification {
  _id: ObjectId;
  userId: string;
  type: "INFO" | "WARN" | "SUCCESS" | "ERROR";
  title: string;
  message?: string;
  link?: string;
  read: boolean;
  created: { at: Date };
}
