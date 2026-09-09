// Real .xlsx generation for the Attendance system, built on SheetJS
// ("xlsx"). The database (LocalStorage, via attendanceService) stays the
// single source of truth — these functions only ever *read* records and
// produce a workbook; nothing here writes back to storage.
//
// Note on formatting: the free/community build of SheetJS used here can
// set column widths, row heights and number/date formats, but it cannot
// apply cell styles (bold, colors, borders) in the browser — that requires
// a paid SheetJS Pro build or a separate styling library. To keep headers
// and summary labels visually distinct without that dependency, this file
// leans on ALL-CAPS section labels and blank separator rows instead of
// bold text. If true bold/colored headers are required, swap this service
// for `exceljs` (also free, supports styling, slightly heavier).

import * as XLSX from "xlsx";
import { formatTime, formatDuration } from "../utils/dateUtils";
import { computeAttendanceMetrics, summarizeStaffAttendance, formatMinutesOfDay } from "../utils/calculations";
import { STATUS_LABELS } from "../constants/storageKeys";
import { shortLocationLabel } from "../utils/geo";

const DETAIL_HEADERS = [
  "Employee Name",
  "Employee ID",
  "Department",
  "Designation",
  "Date",
  "Day",
  "Login Time",
  "Login Status",
  "Late Minutes",
  "Login Location",
  "Login Latitude",
  "Login Longitude",
  "Logout Time",
  "Logout Status",
  "Early Logout Minutes",
  "Logout Location",
  "Logout Latitude",
  "Logout Longitude",
  "Required Hours",
  "Worked Hours",
  "Remaining Hours",
  "Overtime",
  "Attendance Status",
  "Leave Status",
];

function dayName(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { weekday: "long" });
}

// Builds one detail row per attendance record, in the exact column order
// required by the attendance export spec (Section 13).
export function buildDetailRow(record, staffMember, settings) {
  const metrics = computeAttendanceMetrics(record, settings);
  return [
    staffMember?.name || "",
    staffMember?.loginId || staffMember?.id || "",
    staffMember?.department || "",
    staffMember?.role || "",
    record.date,
    dayName(record.date),
    formatTime(record.clockIn),
    metrics.loginStatus === "late" ? "Late" : metrics.loginStatus === "grace" ? "Grace period" : metrics.loginStatus === "on_time" ? "On time" : "--",
    metrics.loginStatus === "late" ? metrics.lateMinutes : 0,
    shortLocationLabel(record.clockInLocation) || "Location unavailable",
    record.clockInLocation?.lat ?? "",
    record.clockInLocation?.lng ?? "",
    formatTime(record.clockOut),
    metrics.logoutStatus === "early" ? "Early" : metrics.logoutStatus === "expired" ? "Expired" : metrics.logoutStatus === "normal" ? "Normal" : "--",
    metrics.logoutStatus === "early" ? metrics.earlyMinutes : 0,
    shortLocationLabel(record.clockOutLocation) || "Location unavailable",
    record.clockOutLocation?.lat ?? "",
    record.clockOutLocation?.lng ?? "",
    formatDuration(metrics.requiredMinutes),
    formatDuration(metrics.workedMinutes),
    formatDuration(metrics.remainingMinutes),
    formatDuration(metrics.extraMinutes),
    STATUS_LABELS[record.status] || record.status || "",
    record.status === "leave" ? "On Leave" : "--",
  ];
}

function autoWidths(rows) {
  const widths = DETAIL_HEADERS.map((h) => h.length);
  rows.forEach((row) => {
    row.forEach((cell, i) => {
      const len = String(cell ?? "").length;
      if (len > widths[i]) widths[i] = len;
    });
  });
  return widths.map((w) => ({ wch: Math.min(Math.max(w + 2, 10), 42) }));
}

function triggerDownload(workbook, filename) {
  XLSX.writeFile(workbook, filename, { bookType: "xlsx" });
}

// Section 13/17 — bulk export: any filtered set of records (today / week /
// month / custom range / one user / one department / everyone). One row
// per attendance record, sorted by date then staff name.
export function exportAttendanceExcel(records, staffById, settings, filename = "attendance-export.xlsx") {
  const sorted = [...records].sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1));
  const dataRows = sorted.map((r) => buildDetailRow(r, staffById[r.staffId], settings));
  const sheetData = [DETAIL_HEADERS, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws["!cols"] = autoWidths(dataRows);
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };
  ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: sheetData.length - 1, c: DETAIL_HEADERS.length - 1 } }) };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendance");
  triggerDownload(wb, filename);
}

// Section 14/15/16 — individual / monthly report for one staff member, with
// a summary block (Sections 6 & 16) on the same sheet above the daily
// detail table, plus a second sheet with the raw daily rows only.
export function exportUserAttendanceExcel({ staffMember, records, settings, periodLabel }) {
  const sorted = [...records].sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1));
  const summary = summarizeStaffAttendance(sorted, settings);

  const summaryRows = [
    ["ATTENDANCE SUMMARY"],
    ["Employee", staffMember?.name || ""],
    ["Employee ID", staffMember?.loginId || staffMember?.id || ""],
    ["Department", staffMember?.department || ""],
    ["Designation", staffMember?.role || ""],
    ["Period", periodLabel || ""],
    ["Total Working Days", summary.totalWorkingDays],
    ["Present", summary.present],
    ["On Leave", summary.leave],
    ["Late Logins", summary.late],
    ["Early Logouts", summary.earlyLogout],
    ["Attendance Percentage", `${summary.attendancePercentage.toFixed(1)}%`],
    ["Total Working Hours", formatDuration(summary.totalWorkedMinutes)],
    ["Average Working Hours/Day", formatDuration(summary.averageWorkedMinutes)],
    ["Average Login Time", formatMinutesOfDay(summary.averageLoginMinutes)],
    ["Average Logout Time", formatMinutesOfDay(summary.averageLogoutMinutes)],
    [],
    ["DAILY ATTENDANCE"],
  ];

  const detailHeaderNoIdentity = ["Date", "Day", "Login", "Logout", "Login Location", "Logout Location", "Working Hours", "Status", "Late", "Early Logout"];
  const dataRows = sorted.map((r) => {
    const metrics = computeAttendanceMetrics(r, settings);
    return [
      r.date,
      dayName(r.date),
      formatTime(r.clockIn),
      formatTime(r.clockOut),
      shortLocationLabel(r.clockInLocation) || "Location unavailable",
      shortLocationLabel(r.clockOutLocation) || "Location unavailable",
      formatDuration(metrics.workedMinutes),
      STATUS_LABELS[r.status] || r.status || "",
      metrics.loginStatus === "late" ? `Late (${metrics.lateMinutes}m)` : "--",
      metrics.logoutStatus === "early" ? `Early (${metrics.earlyMinutes}m)` : "--",
    ];
  });

  const sheetData = [...summaryRows, detailHeaderNoIdentity, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws["!cols"] = [
    { wch: 22 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 28 },
    { wch: 28 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");

  const safeName = (staffMember?.name || "Staff").replace(/[^\w\- ]/g, "").trim().replace(/\s+/g, "_");
  const safePeriod = (periodLabel || "Report").replace(/[^\w\- ]/g, "").trim().replace(/\s+/g, "_");
  triggerDownload(wb, `${safeName}_Attendance_${safePeriod}.xlsx`);
}

// Section 8/9 — Login/Logout Excel report, built from sessionService's
// paired login/logout rows (NOT attendance records — see the Attendance vs
// Login Activity distinction in sessionService.js). No IP column: this app
// has no backend, so no IP is ever captured — see sessionService.js.
const LOGIN_ACTIVITY_HEADERS = [
  "User Name",
  "User ID",
  "Department",
  "Role",
  "Login Date",
  "Login Time",
  "Logout Date",
  "Logout Time",
  "Login Location",
  "Logout Location",
  "Login Latitude",
  "Login Longitude",
  "Logout Latitude",
  "Logout Longitude",
  "Session Duration",
  "Session Status",
];

export function exportLoginActivityExcel(sessionRows, { from, to } = {}, filename) {
  const sorted = [...sessionRows].sort((a, b) => new Date(b.loginAt) - new Date(a.loginAt));
  const dataRows = sorted.map((row) => [
    row.userName || "",
    row.userLoginId || row.userId || "",
    row.department || "",
    row.role || "",
    row.loginAt ? row.loginAt.slice(0, 10) : "",
    formatTime(row.loginAt),
    row.logoutAt ? row.logoutAt.slice(0, 10) : "",
    row.logoutAt ? formatTime(row.logoutAt) : "",
    shortLocationLabel(row.loginLocation) || "Location unavailable",
    shortLocationLabel(row.logoutLocation) || "Location unavailable",
    row.loginLocation?.lat ?? "",
    row.loginLocation?.lng ?? "",
    row.logoutLocation?.lat ?? "",
    row.logoutLocation?.lng ?? "",
    row.durationMinutes != null ? formatDuration(row.durationMinutes) : "",
    row.online ? "Online" : row.logoutAt ? "Logged out" : "No logout recorded",
  ]);
  const sheetData = [LOGIN_ACTIVITY_HEADERS, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws["!cols"] = LOGIN_ACTIVITY_HEADERS.map((h) => ({ wch: Math.min(Math.max(h.length + 2, 12), 30) }));
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };
  ws["!autofilter"] = {
    ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: sheetData.length - 1, c: LOGIN_ACTIVITY_HEADERS.length - 1 } }),
  };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Login Activity");
  const safeRange = `${from || "all"}_to_${to || "all"}`.replace(/[^\w\-]/g, "");
  triggerDownload(wb, filename || `login-activity_${safeRange}.xlsx`);
}
