import { getData, setData } from "./storageService";
import { STORAGE_KEYS } from "../constants/storageKeys";
import * as dbSync from "./dbSync";

// Settings live in their own key/value row in the Cloud database
// (app_settings) rather than in one of the collection tables. Only an admin
// can write them; every signed-in user can read them, since the whole app
// derives its attendance rules from these values.

const DEFAULT_SETTINGS = {
  organizationName: "Staff ClockIn",
  workStartTime: "09:00",
  lateAfterMinutes: 15,
  requiredAttendancePercentage: 75,
  weekendDays: [0, 6], // Sun, Sat

  // Attendance rules — the single source of truth for login/logout status
  // and working-hour calculations. Every screen (staff + admin) reads these
  // via getSettings() rather than hard-coding times, so changing them here
  // (Admin → Attendance Settings) immediately updates the whole app.
  loginTime: "09:30", // scheduled login time
  graceMinutes: 15, // minutes of grace after loginTime before "Late"
  logoutTime: "18:00", // scheduled logout time — before this is "Early Logout"
  logoutMaxTime: "19:30", // logging out after this is "Logout Expired"
  requiredWorkMinutes: 510, // required working hours, in minutes (8h 30m)

  // Leave policy — used by the leave request system to compute each
  // staff member's remaining leave balance for the current calendar year.
  annualLeaveDays: 18,
};

// Keys whose value should stay a number (Sheets cells otherwise come back
// as strings, and weekendDays/lateAfterMinutes etc. would silently break
// downstream math/comparisons if left as "15").
const NUMERIC_KEYS = [
  "lateAfterMinutes",
  "requiredAttendancePercentage",
  "graceMinutes",
  "requiredWorkMinutes",
  "annualLeaveDays",
];

function coerceRemoteSettings(raw) {
  const out = { ...raw };
  NUMERIC_KEYS.forEach((key) => {
    if (out[key] !== undefined && out[key] !== null && out[key] !== "") {
      const n = Number(out[key]);
      if (!Number.isNaN(n)) out[key] = n;
    }
  });
  // weekendDays is stored as a JSON string in the Settings sheet (it's an
  // array, and each Settings row is a single scalar cell).
  if (typeof out.weekendDays === "string") {
    try {
      out.weekendDays = JSON.parse(out.weekendDays);
    } catch {
      delete out.weekendDays; // fall back to DEFAULT_SETTINGS.weekendDays
    }
  }
  return out;
}

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...getData(STORAGE_KEYS.SETTINGS, {}) };
}

// Pulls the shared settings down from the Sheets backend (when configured)
// into the local cache. Call once on mount — see useSettings.
export async function syncSettings() {
  try {
    const remote = await dbSync.fetchSettings();
    const merged = { ...getData(STORAGE_KEYS.SETTINGS, {}), ...coerceRemoteSettings(remote) };
    setData(STORAGE_KEYS.SETTINGS, merged);
    return { ...DEFAULT_SETTINGS, ...merged };
  } catch (err) {
    console.error("settingsService: failed to fetch settings", err);
    return getSettings();
  }
}

export async function saveSettings(updates) {
  const current = getSettings();
  const next = { ...current, ...updates };
  setData(STORAGE_KEYS.SETTINGS, next);
  // Stored as a single JSON value, so arrays like weekendDays travel as-is.
  await dbSync.saveSettingsToCloud(next);
  return next;
}

export { DEFAULT_SETTINGS };
