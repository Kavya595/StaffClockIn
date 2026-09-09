// Leave request workflow. Sits alongside attendanceService rather than
// inside it: a leave *request* (pending/approved/rejected) is its own
// record with its own lifecycle, but once approved it is projected onto
// the existing attendance records (status: "leave") via markStatus, so
// every screen that already reads attendance (dashboard, staff detail,
// calendar, reports, Excel export) picks up approved leave automatically
// and — per spec — never counts an approved leave day as absent.
import { getData } from "./storageService";
import { STORAGE_KEYS, LEAVE_STATUS, ATTENDANCE_STATUS } from "../constants/storageKeys";
import { generateId } from "../utils/idGenerator";
import { addDays } from "../utils/dateUtils";
import { getCurrentUser } from "./authService";
import * as attendanceService from "./attendanceService";
import { syncCollection, persistCollection } from "./sheetsSync";

function actorStamp() {
  const user = getCurrentUser();
  if (!user) return null;
  return { id: user.id || user.username, name: user.name, role: user.role };
}

export function getAllLeaves() {
  return getData(STORAGE_KEYS.LEAVES, []);
}

// Pulls the shared leave-request list down from the Sheets backend (when
// configured) into the local cache. Call once on mount — see useLeaves.
export function syncLeaves() {
  return syncCollection(STORAGE_KEYS.LEAVES, []);
}

async function saveAllLeaves(list) {
  return persistCollection(STORAGE_KEYS.LEAVES, list);
}

export function getLeavesForStaff(staffId) {
  return getAllLeaves().filter((l) => l.staffId === staffId);
}

// Every date in [fromDate, toDate] inclusive, as "YYYY-MM-DD" strings.
function datesInRange(fromDate, toDate) {
  const dates = [];
  let cursor = fromDate;
  let guard = 0;
  while (cursor <= toDate && guard < 366) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return dates;
}

export async function requestLeave(staffId, { fromDate, toDate, reason, type = "leave" }) {
  if (!staffId || !fromDate || !toDate) return null;
  const from = fromDate <= toDate ? fromDate : toDate;
  const to = fromDate <= toDate ? toDate : fromDate;
  const now = new Date().toISOString();
  const record = {
    id: generateId("lve"),
    staffId,
    fromDate: from,
    toDate: to,
    days: datesInRange(from, to).length,
    reason: reason || "",
    type,
    status: LEAVE_STATUS.PENDING,
    requestedAt: now,
    requestedBy: actorStamp(),
    decidedAt: null,
    decidedBy: null,
    adminNote: "",
  };
  await saveAllLeaves([...getAllLeaves(), record]);
  return record;
}

// Approve a pending request: marks every date in its range as "leave" on
// the shared attendance records, so it's immediately reflected everywhere
// (and is never counted as absent) without duplicating any attendance logic.
export async function approveLeave(id, adminNote = "") {
  const list = getAllLeaves();
  const existing = list.find((l) => l.id === id);
  if (!existing) return null;
  const now = new Date().toISOString();
  const decidedBy = actorStamp();
  const updated = list.map((l) =>
    l.id === id ? { ...l, status: LEAVE_STATUS.APPROVED, decidedAt: now, decidedBy, adminNote } : l
  );
  await saveAllLeaves(updated);
  for (const date of datesInRange(existing.fromDate, existing.toDate)) {
    await attendanceService.markStatus(existing.staffId, date, ATTENDANCE_STATUS.LEAVE, existing.reason || "Approved leave");
  }
  return updated.find((l) => l.id === id);
}

export async function rejectLeave(id, adminNote = "") {
  const list = getAllLeaves();
  const now = new Date().toISOString();
  const decidedBy = actorStamp();
  const updated = list.map((l) =>
    l.id === id ? { ...l, status: LEAVE_STATUS.REJECTED, decidedAt: now, decidedBy, adminNote } : l
  );
  await saveAllLeaves(updated);
  return updated.find((l) => l.id === id);
}

// Staff can withdraw their own request while it's still pending.
export async function cancelLeave(id) {
  const list = getAllLeaves();
  const updated = list.map((l) =>
    l.id === id && l.status === LEAVE_STATUS.PENDING ? { ...l, status: LEAVE_STATUS.CANCELLED } : l
  );
  await saveAllLeaves(updated);
}

export async function deleteLeave(id) {
  await saveAllLeaves(getAllLeaves().filter((l) => l.id !== id));
}

// Used / remaining leave balance for the current calendar year, from
// approved requests only.
export function summarizeLeaveBalance(staffId, settings, year = new Date().getFullYear()) {
  const leaves = getLeavesForStaff(staffId).filter(
    (l) => l.status === LEAVE_STATUS.APPROVED && l.fromDate.startsWith(String(year))
  );
  const used = leaves.reduce((sum, l) => sum + (l.days || 0), 0);
  const annualLeaveDays = settings?.annualLeaveDays ?? 18;
  return {
    annualLeaveDays,
    used,
    remaining: Math.max(0, annualLeaveDays - used),
  };
}
