export const STORAGE_KEYS = {
  STAFF: "attendance_tracker_staff",
  DEPARTMENTS: "attendance_tracker_departments",
  ATTENDANCE: "attendance_tracker_attendance",
  SETTINGS: "attendance_tracker_settings",
  CURRENT_USER: "attendance_tracker_current_user",
  AUTH_TOKEN: "attendance_tracker_auth_token",
  USERS: "attendance_tracker_users",
  SESSIONS: "attendance_tracker_sessions",
  LEAVES: "attendance_tracker_leaves",
  LEAVE_TYPES: "attendance_tracker_leave_types",
  LEAVE_REASONS: "attendance_tracker_leave_reasons",
  HOLIDAYS: "attendance_tracker_holidays",
  VERSION: "1.0.0",
};

export const HOLIDAY_TYPES = {
  PUBLIC: "public",
  COMPANY: "company",
  OPTIONAL: "optional",
  FESTIVAL: "festival",
  REGIONAL: "regional",
  OBSERVANCE: "observance",
};

export const HOLIDAY_TYPE_LABELS = {
  public: "Public",
  company: "Company",
  optional: "Optional",
  festival: "Festival",
  regional: "Regional",
  observance: "Freedom Fighter / National Day",
};

export const HOLIDAY_TYPE_COLORS = {
  public: { bg: "bg-moss-light", text: "text-moss", dot: "bg-moss" },
  company: { bg: "bg-violet-100", text: "text-violet-600", dot: "bg-violet-500" },
  optional: { bg: "bg-ink-100", text: "text-ink-500", dot: "bg-ink-300" },
  festival: { bg: "bg-honey-light", text: "text-honey", dot: "bg-honey" },
  regional: { bg: "bg-rust-light", text: "text-rust", dot: "bg-rust" },
  observance: { bg: "bg-sky-light", text: "text-sky", dot: "bg-sky" },
};

// Palette used for admin-created leave types (cycled through, not tied
// to any particular meaning).
export const LEAVE_TYPE_COLOR_PALETTE = ["moss", "honey", "rust", "violet", "brass", "ink"];

export const LEAVE_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
};

export const LEAVE_STATUS_LABELS = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export const LEAVE_STATUS_COLORS = {
  pending: { bg: "bg-honey-light", text: "text-honey", dot: "bg-honey" },
  approved: { bg: "bg-moss-light", text: "text-moss", dot: "bg-moss" },
  rejected: { bg: "bg-rust-light", text: "text-rust", dot: "bg-rust" },
  cancelled: { bg: "bg-ink-100", text: "text-ink-500", dot: "bg-ink-300" },
};

export const ATTENDANCE_STATUS = {
  PRESENT: "present",
  LEAVE: "leave",
  LATE: "late",
  HALF_DAY: "half_day",
};

export const STATUS_LABELS = {
  present: "Present",
  leave: "On Leave",
  late: "Late",
  half_day: "Half Day",
};

export const STATUS_COLORS = {
  present: { bg: "bg-moss-light", text: "text-moss", dot: "bg-moss" },
  leave: { bg: "bg-violet-100", text: "text-violet-600", dot: "bg-violet-500" },
  late: { bg: "bg-rust-light", text: "text-rust", dot: "bg-rust" },
  half_day: { bg: "bg-honey-light", text: "text-honey", dot: "bg-honey" },
};
