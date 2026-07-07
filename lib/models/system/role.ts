import { ObjectId } from "mongodb";

export interface SystemRole {
  _id: ObjectId;
  parent: ObjectId | null;
  name: string;
  description?: string;
  url?: string;
  created: {
    at: Date;
    by: ObjectId | null;
  };
  updated: {
    at: Date;
    by: ObjectId | null;
  };
}

export interface SystemGroupHasRole {
  _id: ObjectId;
  groupId: ObjectId;
  roleId: ObjectId;
  created: {
    at: Date;
    by: ObjectId | null;
  };
}
