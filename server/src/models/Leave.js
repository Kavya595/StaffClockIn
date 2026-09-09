import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema(
  {
    _id: { type: String },
    staffId: { type: String, required: true, index: true },
    fromDate: { type: String, required: true },
    toDate: { type: String, required: true },
    days: { type: Number, default: 1 },
    reason: { type: String, default: "" },
    type: { type: String, default: "leave" },
    status: { type: String, default: "pending" },
    requestedAt: { type: String, default: null },
    requestedBy: { type: mongoose.Schema.Types.Mixed, default: null },
    decidedAt: { type: String, default: null },
    decidedBy: { type: mongoose.Schema.Types.Mixed, default: null },
    adminNote: { type: String, default: "" },
  },
  { timestamps: true, _id: false },
);

export default mongoose.model("Leave", leaveSchema);
