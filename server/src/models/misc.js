import mongoose from "mongoose";

const { Schema, model } = mongoose;

const departmentSchema = new Schema(
  { _id: { type: String }, name: { type: String, required: true } },
  { timestamps: true, _id: false },
);

const leaveTypeSchema = new Schema(
  {
    _id: { type: String },
    name: { type: String, required: true },
    color: { type: String, default: null },
    paid: { type: Boolean, default: true },
  },
  { timestamps: true, _id: false },
);

const leaveReasonSchema = new Schema(
  { _id: { type: String }, name: { type: String, required: true } },
  { timestamps: true, _id: false },
);

const holidaySchema = new Schema(
  {
    _id: { type: String },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    type: { type: String, default: "public" },
    date: { type: String, required: true },
    recurring: { type: Boolean, default: false },
  },
  { timestamps: true, _id: false },
);

const appSettingSchema = new Schema(
  {
    _id: { type: String }, // the settings "key" — this app only ever uses "app"
    value: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, _id: false },
);

const loginEventSchema = new Schema(
  {
    _id: { type: String },
    type: { type: String, required: true },
    userId: { type: String, default: null, index: true },
    userName: { type: String, default: null },
    userLoginId: { type: String, default: null },
    role: { type: String, default: null },
    department: { type: String, default: null },
    at: { type: String, required: true },
    location: { type: Schema.Types.Mixed, default: null },
    device: { type: Schema.Types.Mixed, default: null },
    reason: { type: String, default: null },
    closedAt: { type: String, default: null },
    logoutEventId: { type: String, default: null },
    durationMinutes: { type: Number, default: null },
  },
  { timestamps: true, _id: false },
);

export const Department = model("Department", departmentSchema);
export const LeaveType = model("LeaveType", leaveTypeSchema);
export const LeaveReason = model("LeaveReason", leaveReasonSchema);
export const Holiday = model("Holiday", holidaySchema);
export const AppSetting = model("AppSetting", appSettingSchema);
export const LoginEvent = model("LoginEvent", loginEventSchema);
