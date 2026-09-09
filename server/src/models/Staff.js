import mongoose from "mongoose";

// Staff directory. `_id` is the app-generated id (e.g. "stf_abc123") so it
// matches the record shape the frontend already works with — no id
// translation layer needed between client and database.
const staffSchema = new mongoose.Schema(
  {
    _id: { type: String },
    name: { type: String, required: true },
    role: { type: String, default: "" },
    department: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    joinDate: { type: String, default: null },
    birthDate: { type: String, default: null },
    status: { type: String, default: "active" },
    avatarColor: { type: String, default: null },
    loginId: { type: String, default: null, unique: true, sparse: true },
    // Links to the User (portal login) account for this staff member, if any.
    authUserId: { type: String, default: null },
  },
  { timestamps: true, _id: false },
);

export default mongoose.model("Staff", staffSchema);
