import { ObjectId } from "mongodb";

export interface SystemGroup {
  _id: ObjectId;
  name: string;
  description?: string;
  isActive?: boolean;
  created: {
    at: Date;
    by: ObjectId | null;
  };
  updated: {
    at: Date;
    by: ObjectId | null;
  };
}
