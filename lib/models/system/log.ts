import { ObjectId } from "mongodb";

export type LogLevel = "INFO" | "WARN" | "ERROR";
export type LogCategory = "AUTH" | "USER" | "GROUP" | "ROLE" | "CONTENT" | "REDIRECT" | "SETTINGS" | "PROFILE" | "API_KEY" | "SYSTEM" | "AD";

export interface SystemLog {
  _id: ObjectId;
  userId: ObjectId;
  username: string;
  action: string;
  category: LogCategory;
  method?: string;
  target?: string;
  detail?: string;
  oldValue?: string;
  newValue?: string;
  ip?: string;
  level: LogLevel;
  created: { at: Date };
}
