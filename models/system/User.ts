import { Schema, model, models } from "mongoose";

const UserSchema = new Schema(
  {
    username: { type: String, required: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: null },
    image: { type: String, default: null },
    biography: { type: String, default: "" },
  },
  { collection: "systemUsers" }
);

const User = models.User || model("User", UserSchema);
export default User;
