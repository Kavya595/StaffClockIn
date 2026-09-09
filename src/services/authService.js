// Authentication against the MongoDB/Express backend (real email + password
// accounts, JWT-based sessions).
//
// The session object this module produces is the same shape the whole app
// already consumes ({ id, name, role, department, staffId, ... }) and is
// mirrored into STORAGE_KEYS.CURRENT_USER so synchronous readers such as
// attendanceService.actorStamp() keep working unchanged. The signed JWT is
// mirrored into STORAGE_KEYS.AUTH_TOKEN and attached to every API request
// by apiClient.
import { getData, setData, removeData, clearAllData } from "./storageService";
import { STORAGE_KEYS } from "../constants/storageKeys";
import { apiFetch } from "../lib/apiClient";
import * as sessionService from "./sessionService";

async function signIn(email, password, location, { path } = {}) {
  const trimmed = (email || "").trim();
  if (!trimmed) return { success: false, error: "Enter your email address." };

  let result;
  try {
    result = await apiFetch(path, { method: "POST", body: { email: trimmed, password }, auth: false });
  } catch (err) {
    await sessionService.recordFailedLogin(trimmed, err.message || "Invalid credentials");
    return { success: false, error: err.message || "Unable to sign in. Please try again." };
  }

  const { token, user: session } = result;
  setData(STORAGE_KEYS.AUTH_TOKEN, token);
  setData(STORAGE_KEYS.CURRENT_USER, session);

  try {
    await sessionService.recordLogin(session, location);
  } catch {
    // Never let the audit-log write turn a successful sign-in into a
    // failure — sessionService already retries best-effort internally.
  }
  return { success: true, user: session };
}

// Admin login — only accounts holding the admin role can complete it.
export async function login(email, password, location = null) {
  return signIn(email, password, location, { path: "/auth/login" });
}

// Staff portal login — admin accounts are bounced to the admin sign-in.
export async function staffLogin(email, password, location = null) {
  return signIn(email, password, location, { path: "/auth/staff-login" });
}

// Re-derives the app session from the backend, using the stored JWT. Called
// on every app boot.
export async function restoreSession() {
  const token = getData(STORAGE_KEYS.AUTH_TOKEN, null);
  if (!token) {
    removeData(STORAGE_KEYS.CURRENT_USER);
    return null;
  }
  try {
    const { user: session } = await apiFetch("/auth/me");
    setData(STORAGE_KEYS.CURRENT_USER, session);
    return session;
  } catch {
    removeData(STORAGE_KEYS.CURRENT_USER);
    removeData(STORAGE_KEYS.AUTH_TOKEN);
    return null;
  }
}

// Shared-collection caches that mirror backend data. These must not survive
// past the session that populated them: if this device is later used to
// sign in as someone else (a shared kiosk, a staff member borrowing an
// admin's browser, etc.), any records the previous user could see but the
// next one can't must not linger — and must never get pushed back up to
// the backend under the new, less-privileged session (see dbSync.saveCollection,
// which upserts whole cached collections and is authorized server-side the
// moment it does that with data it doesn't own).
const CLOUD_CACHE_KEYS = [
  STORAGE_KEYS.STAFF,
  STORAGE_KEYS.DEPARTMENTS,
  STORAGE_KEYS.ATTENDANCE,
  STORAGE_KEYS.SESSIONS,
  STORAGE_KEYS.LEAVES,
  STORAGE_KEYS.LEAVE_TYPES,
  STORAGE_KEYS.LEAVE_REASONS,
  STORAGE_KEYS.HOLIDAYS,
];

// `location` here is the *logout* location snapshot (optional, best-effort).
export async function logout(location = null) {
  const user = getCurrentUser();
  if (user) {
    try {
      await sessionService.recordLogout(user, location);
    } catch {
      // never block sign-out on the audit write
    }
  }
  removeData(STORAGE_KEYS.CURRENT_USER);
  removeData(STORAGE_KEYS.AUTH_TOKEN);
  clearAllData(CLOUD_CACHE_KEYS);
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } catch {
    // stateless tokens — nothing to clean up server-side either way
  }
}

export async function changeOwnPassword(currentPassword, newPassword) {
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: "New password must be at least 6 characters." };
  }
  try {
    await apiFetch("/auth/change-password", { method: "POST", body: { currentPassword, newPassword } });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Synchronous mirror of the current session, for the many call sites that
// stamp records with "who did this" while already inside a signed-in screen.
export function getCurrentUser() {
  return getData(STORAGE_KEYS.CURRENT_USER, null);
}
