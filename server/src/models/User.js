import mongoose from "mongoose";

// Auth accounts. Combines what used to be Supabase's auth.users + profiles +
// user_roles into a single collection: one login (email/password) maps to
// exactly one role. Admin accounts stand alone; staff accounts are linked to
// a Staff directory row via `staffId`.
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, default: "" },
    role: { type: String, enum: ["admin", "staff"], required: true },
    // Only set for role: "staff" — the Staff directory row this login belongs to.
    staffId: { type: String, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
