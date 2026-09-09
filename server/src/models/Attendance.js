import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    _id: { type: String },
    staffId: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    clockIn: { type: String, default: null },
    clockOut: { type: String, default: null },
    status: { type: String, default: null },
    loginStatus: { type: String, default: null },
    lateMinutes: { type: Number, default: 0 },
    logoutStatus: { type: String, default: null },
    earlyMinutes: { type: Number, default: 0 },
    requiredMinutes: { type: Number, default: null },
    workedMinutes: { type: Number, default: null },
    workingHoursDiff: { type: Number, default: null },
    note: { type: String, default: "" },
    markedBy: { type: mongoose.Schema.Types.Mixed, default: null },
    correctedBy: { type: mongoose.Schema.Types.Mixed, default: null },
    correctedAt: { type: String, default: null },
    clockInLocation: { type: mongoose.Schema.Types.Mixed, default: null },
    clockOutLocation: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true, _id: false },
);

attendanceSchema.index({ staffId: 1, date: 1 }, { unique: true });

export default mongoose.model("Attendance", attendanceSchema);
