import { getData, setData } from "./storageService";
import { STORAGE_KEYS, ATTENDANCE_STATUS } from "../constants/storageKeys";
import { generateId } from "../utils/idGenerator";
import { todayISO, combineDateAndTime, isClockOutAllowedNow } from "../utils/dateUtils";
import { computeLoginStatus, computeLogoutStatus, getRequiredMinutes, calculateWorkedMinutes } from "../utils/calculations";
import { getCurrentUser } from "./authService";
import { getSettings } from "./settingsService";
import * as sheetsApi from "./sheetsApi";
import { syncCollection, persistCollection } from "./sheetsSync";

// When the Google Apps Script + Google Sheets backend is configured
// (VITE_APPS_SCRIPT_URL set), clockIn/clockOut are re-validated server-side
// there — duplicate punches, geofencing, GPS accuracy, and the official
// timestamp all come from Code.gs, not the browser. The result is still
// mirrored into the local ATTENDANCE cache below so every other screen in
// this app (built against getAllAttendance()/getRecordFor()) keeps working
// unchanged. See INTEGRATION.md for the full read/write split.
const USE_SHEETS = sheetsApi.isSheetsBackendConfigured();

export function getAllAttendance() {
  return getData(STORAGE_KEYS.ATTENDANCE, []);
}

// Local cache write + write-through to the Cloud database. Kept
// synchronous-looking (it returns the persist promise) so the many callers
// below don't have to change, while still surfacing failures in the console.
//
// `throwOnError` lets callers that can actually act on a failure (clockIn/
// clockOut, where the punch either really happened or it didn't) opt into
// seeing it. Without this, a rejected write (e.g. blocked by a database
// permission check) was swallowed here — the button showed "Clocked in!"
// straight away, but the change never reached the database and the
// optimistic local copy was rolled back moments later, so the record
// silently disappeared again with no explanation.
export function saveAllAttendance(list, { throwOnError = false } = {}) {
  setData(STORAGE_KEYS.ATTENDANCE, list);
  const persisted = persistCollection(STORAGE_KEYS.ATTENDANCE, list).catch((err) => {
    console.error("attendanceService: failed to save attendance", err);
    if (throwOnError) throw err;
  });
  return throwOnError ? persisted : persisted.then(() => undefined);
}

// Pulls the attendance records the signed-in user is allowed to see down
// from the database into the local cache. Call once on mount.
export function syncAttendance() {
  return syncCollection(STORAGE_KEYS.ATTENDANCE, []);
}

export function getRecordFor(staffId, date) {
  return getAllAttendance().find((r) => r.staffId === staffId && r.date === date) || null;
}

export function getRecordsForDate(date) {
  return getAllAttendance().filter((r) => r.date === date);
}

export function getRecordsForStaff(staffId) {
  return getAllAttendance().filter((r) => r.staffId === staffId);
}

// Stamps every write with whoever is currently signed in — an Admin
// marking on someone's behalf, or a Staff member marking their own —
// so Admin can audit who actually recorded a given entry (see
// Attendance > "Marked by").
function actorStamp() {
  const user = getCurrentUser();
  if (!user) return null;
  return { id: user.id || user.username, name: user.name, role: user.role };
}

// Clock in: creates or updates today's record with a clockIn timestamp.
// `location`, when provided, is a { lat, lng, accuracy, address, capturedAt }
// snapshot captured from the browser's real GPS at the moment of punching in.
// Login status (on time / late) is derived from the admin-configurable
// attendance settings at the moment of punching in, and stamped onto the
// record so it doesn't need to be recomputed everywhere it's displayed.
function loginFields(clockInIso) {
  const settings = getSettings();
  const login = computeLoginStatus(clockInIso, settings);
  return {
    loginStatus: login.status,
    lateMinutes: login.lateMinutes,
    status: login.status === "late" ? ATTENDANCE_STATUS.LATE : ATTENDANCE_STATUS.PRESENT,
  };
}

// Logout status (early / normal / expired) plus worked-vs-required working
// hours, derived from the same attendance settings.
function logoutFields(record, clockOutIso) {
  const settings = getSettings();
  const logout = computeLogoutStatus(clockOutIso, settings);
  const requiredMinutes = getRequiredMinutes(settings);
  const workedMinutes = calculateWorkedMinutes({ clockIn: record.clockIn, clockOut: clockOutIso });
  return {
    logoutStatus: logout.status,
    earlyMinutes: logout.earlyMinutes,
    requiredMinutes,
    workedMinutes,
    workingHoursDiff: workedMinutes == null ? null : workedMinutes - requiredMinutes,
  };
}

// Merges the Apps Script response into the local cache so existing
// screens reading getAllAttendance()/getRecordFor() see the update
// immediately, without needing every consumer rewritten against the
// async sheetsApi client directly.
function mirrorSheetsRecord(staffId, date, patch) {
  const list = getAllAttendance();
  const existing = list.find((r) => r.staffId === staffId && r.date === date);
  const now = new Date().toISOString();
  if (existing) {
    const updated = list.map((r) => (r.id === existing.id ? { ...r, ...patch, updatedAt: now } : r));
    saveAllAttendance(updated);
    return updated.find((r) => r.id === existing.id);
  }
  const record = {
    id: generateId("att"),
    staffId,
    date,
    clockIn: null,
    clockOut: null,
    note: "",
    markedBy: actorStamp(),
    clockInLocation: null,
    clockOutLocation: null,
    createdAt: now,
    updatedAt: now,
    ...patch,
  };
  saveAllAttendance([...list, record]);
  return record;
}

export async function clockIn(staffId, date = todayISO(), location = null) {
  if (USE_SHEETS) {
    const result = await sheetsApi.clockIn({
      latitude: location?.lat,
      longitude: location?.lng,
      accuracy: location?.accuracy,
      address: location?.address,
    });
    return mirrorSheetsRecord(staffId, date, {
      clockIn: result.clockIn,
      status: result.loginStatus === "Late" ? ATTENDANCE_STATUS.LATE : ATTENDANCE_STATUS.PRESENT,
      loginStatus: result.loginStatus?.toLowerCase(),
      lateMinutes: result.lateMinutes,
      clockInLocation: location || null,
    });
  }
  const list = getAllAttendance();
  const existing = list.find((r) => r.staffId === staffId && r.date === date);
  const now = new Date().toISOString();
  const markedBy = actorStamp();
  if (existing) {
    if (existing.clockIn) return existing; // already clocked in
    const updated = list.map((r) =>
      r.id === existing.id
        ? {
            ...r,
            clockIn: now,
            ...loginFields(now),
            markedBy,
            updatedAt: now,
            clockInLocation: location || null,
          }
        : r
    );
    // Awaited (and allowed to throw) so a rejected write — e.g. the
    // database refusing it because this account isn't properly linked to
    // a staff record — surfaces immediately as a real error instead of
    // quietly reverting a few seconds later.
    await saveAllAttendance(updated, { throwOnError: true });
    return updated.find((r) => r.id === existing.id);
  }
  const record = {
    id: generateId("att"),
    staffId,
    date,
    clockIn: now,
    clockOut: null,
    ...loginFields(now),
    note: "",
    markedBy,
    clockInLocation: location || null,
    clockOutLocation: null,
    createdAt: now,
    updatedAt: now,
  };
  await saveAllAttendance([...list, record], { throwOnError: true });
  return record;
}

export async function clockOut(staffId, date = todayISO(), location = null) {
  if (USE_SHEETS) {
    const result = await sheetsApi.clockOut({
      latitude: location?.lat,
      longitude: location?.lng,
      accuracy: location?.accuracy,
      address: location?.address,
    });
    return mirrorSheetsRecord(staffId, date, {
      clockOut: result.clockOut,
      clockOutLocation: location || null,
    });
  }
  if (!isClockOutAllowedNow()) {
    throw new Error("Clock out is only available after 6:00 PM.");
  }
  const list = getAllAttendance();
  const existing = list.find((r) => r.staffId === staffId && r.date === date);
  if (!existing || !existing.clockIn) return null;
  const now = new Date().toISOString();
  const markedBy = actorStamp();
  const updated = list.map((r) =>
    r.id === existing.id
      ? { ...r, clockOut: now, ...logoutFields(existing, now), markedBy, updatedAt: now, clockOutLocation: location || null }
      : r
  );
  await saveAllAttendance(updated, { throwOnError: true });
  return updated.find((r) => r.id === existing.id);
}

// Admin manual correction — lets an admin fix a staff member's clock-in /
// clock-out time (as "HH:mm" strings) or status for a given date. All the
// derived attendance-rule fields (login/logout status, late/early minutes,
// worked/required minutes, working-hour difference) are recalculated from
// the corrected times using the same settings-driven functions as clockIn /
// clockOut, so nothing gets out of sync.
export function correctRecord(staffId, date, { clockInTime, clockOutTime, status, note } = {}) {
  const list = getAllAttendance();
  const existing = list.find((r) => r.staffId === staffId && r.date === date);
  const now = new Date().toISOString();
  const markedBy = actorStamp();

  const clockIn = clockInTime ? combineDateAndTime(date, clockInTime) : existing?.clockIn ?? null;
  const clockOut = clockOutTime ? combineDateAndTime(date, clockOutTime) : existing?.clockOut ?? null;

  const derived = {
    // With no clock-in and no explicit status, the day is simply left
    // unmarked (status: null) rather than auto-assigned "absent" — the app
    // no longer auto-marks anyone absent.
    ...(clockIn ? loginFields(clockIn) : { loginStatus: null, lateMinutes: 0, status: existing?.status || null }),
    ...(clockIn && clockOut ? logoutFields({ clockIn }, clockOut) : { logoutStatus: null, earlyMinutes: 0, requiredMinutes: getRequiredMinutes(getSettings()), workedMinutes: null, workingHoursDiff: null }),
  };
  if (status) derived.status = status; // explicit status override wins over the derived one

  if (existing) {
    const updated = list.map((r) =>
      r.id === existing.id
        ? { ...r, clockIn, clockOut, ...derived, note: note ?? r.note, markedBy, updatedAt: now, correctedBy: markedBy, correctedAt: now }
        : r
    );
    saveAllAttendance(updated);
    return updated.find((r) => r.id === existing.id);
  }

  const record = {
    id: generateId("att"),
    staffId,
    date,
    clockIn,
    clockOut,
    ...derived,
    note: note || "",
    markedBy,
    clockInLocation: null,
    clockOutLocation: null,
    createdAt: now,
    updatedAt: now,
    correctedBy: markedBy,
    correctedAt: now,
  };
  saveAllAttendance([...list, record]);
  return record;
}

// Manually mark a status (present/leave/late/half_day) for a given date,
// used by the Attendance page for bulk / manual marking rather than the clock.
export function markStatus(staffId, date, status, note = "") {
  const list = getAllAttendance();
  const existing = list.find((r) => r.staffId === staffId && r.date === date);
  const now = new Date().toISOString();
  const markedBy = actorStamp();
  if (existing) {
    const updated = list.map((r) =>
      r.id === existing.id ? { ...r, status, note, markedBy, updatedAt: now } : r
    );
    saveAllAttendance(updated);
    return updated.find((r) => r.id === existing.id);
  }
  const record = {
    id: generateId("att"),
    staffId,
    date,
    clockIn: status === ATTENDANCE_STATUS.PRESENT || status === ATTENDANCE_STATUS.LATE ? new Date().toISOString() : null,
    clockOut: null,
    status,
    note,
    markedBy,
    createdAt: now,
    updatedAt: now,
  };
  saveAllAttendance([...list, record]);
  return record;
}

export function deleteRecord(id) {
  const list = getAllAttendance();
  saveAllAttendance(list.filter((r) => r.id !== id));
}

export function deleteRecordsForStaff(staffId) {
  const list = getAllAttendance();
  saveAllAttendance(list.filter((r) => r.staffId !== staffId));
}
