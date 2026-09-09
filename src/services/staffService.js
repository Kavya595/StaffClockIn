import { getData, setData } from "./storageService";
import { STORAGE_KEYS } from "../constants/storageKeys";
import { generateId } from "../utils/idGenerator";
import { syncCollection } from "./sheetsSync";
import * as dbSync from "./dbSync";
import { apiFetch } from "../lib/apiClient";
import {
  createStaffAccount,
  setStaffPassword,
  deleteStaffAccount,
} from "../lib/staff-accounts.functions";

// The backend's error responses are already plain, user-facing text
// (see server/src/routes/auth.js), but this stays as a safety net in case
// a raw validation payload ever slips through.
function humanizeServerError(err) {
  const raw = err?.message || "";
  try {
    const issues = JSON.parse(raw);
    if (Array.isArray(issues) && issues[0]?.message) {
      return issues.map((i) => i.message).join(" ");
    }
  } catch {
    // not a JSON error payload — fall through and use it as-is
  }
  return raw;
}

// Staff records double as portal accounts: `loginId` + `password` let a
// staff member sign in at /staff/login, and `status` (active/inactive)
// gates that login without touching their historical attendance data.
const DEFAULT_STAFF = [
  {
    id: "stf_seed1",
    name: "Amara Whitfield",
    role: "Floor Supervisor",
    department: "Operations",
    email: "amara.whitfield@example.com",
    phone: "555-0142",
    joinDate: "2023-02-14",
    status: "active",
    avatarColor: "#120D9E",
    loginId: "STF001",
    password: "staff123",
  },
  {
    id: "stf_seed2",
    name: "Devon Okafor",
    role: "Cashier",
    department: "Retail",
    email: "devon.okafor@example.com",
    phone: "555-0198",
    joinDate: "2023-06-01",
    status: "active",
    avatarColor: "#13A870",
    loginId: "STF002",
    password: "staff123",
  },
  {
    id: "stf_seed3",
    name: "Priya Nair",
    role: "Warehouse Lead",
    department: "Logistics",
    email: "priya.nair@example.com",
    phone: "555-0110",
    joinDate: "2022-11-20",
    status: "active",
    avatarColor: "#E14868",
    loginId: "STF003",
    password: "staff123",
  },
  {
    id: "stf_seed4",
    name: "Marcus Lee",
    role: "Barista",
    department: "Retail",
    email: "marcus.lee@example.com",
    phone: "555-0176",
    joinDate: "2024-01-09",
    status: "inactive",
    avatarColor: "#7B7FA0",
    loginId: "STF004",
    password: "staff123",
  },
];

export function getAllStaff() {
  return getData(STORAGE_KEYS.STAFF, DEFAULT_STAFF);
}

// Pulls the shared staff directory down from the Sheets backend (when
// configured) into the local cache. Call once on mount — see useStaff /
// useMyStaff. Stored as its own Collections-sheet blob rather than folded
// into the Employees sheet, since Staff here (job title, department,
// portal login) is a distinct record shape from Employees (admin auth) —
// see INTEGRATION.md.
export function syncStaff() {
  return syncCollection(STORAGE_KEYS.STAFF, DEFAULT_STAFF);
}

export function getStaffById(id) {
  return getAllStaff().find((s) => s.id === id) || null;
}

export function getStaffByLoginId(loginId) {
  if (!loginId) return null;
  const needle = loginId.trim().toLowerCase();
  return (
    getAllStaff().find(
      (s) =>
        (s.loginId && s.loginId.toLowerCase() === needle) ||
        (s.email && s.email.toLowerCase() === needle),
    ) || null
  );
}

export async function saveAllStaff(list) {
  setData(STORAGE_KEYS.STAFF, list);
  return list;
}

// Suggests the next sequential Staff ID (e.g. STF005). Admin can still
// override it in the form — this just saves them from inventing one.
export function suggestLoginId() {
  const list = getAllStaff();
  let n = list.length + 1;
  const taken = new Set(list.map((s) => (s.loginId || "").toUpperCase()));
  let candidate = `STF${String(n).padStart(3, "0")}`;
  while (taken.has(candidate)) {
    n += 1;
    candidate = `STF${String(n).padStart(3, "0")}`;
  }
  return candidate;
}

// Adds a staff member and, when a password is supplied, provisions their
// portal login account (email + password) so they can sign in immediately.
//
// Writes only the one new row remotely (dbSync.insertRow), not the whole
// cached staff list — a full-collection upsert (the old behavior) means a
// single stale/invalid row anywhere in this browser's local cache — left
// behind by another admin's device, an old app version, whatever — fails
// the *entire* batch and blocks every future "add staff" until that cache
// is cleared, even though the new row itself was perfectly valid.
export async function addStaff(data) {
  const list = getAllStaff();
  const { password, confirmPassword, ...fields } = data;
  const record = {
    id: generateId("stf"),
    status: "active",
    joinDate: data.joinDate || new Date().toISOString().slice(0, 10),
    avatarColor: pickColor(list.length),
    ...fields,
  };

  await dbSync.insertRow(STORAGE_KEYS.STAFF, record);
  await saveAllStaff([...list, record]);

  if (password) {
    if (!record.email) {
      // Roll back — a staff entry that can never log in is worse than no
      // entry at all, and silently leaving it behind is exactly how staff
      // end up unable to sign in after being "successfully" added.
      await dbSync.deleteRow(STORAGE_KEYS.STAFF, record.id).catch(() => {});
      await saveAllStaff(list);
      throw new Error("An email address is required to create a portal login.");
    }
    try {
      await createStaffAccount({
        data: { staffId: record.id, email: record.email, password, name: record.name },
      });
    } catch (err) {
      // The portal account never got created (or never got linked back to
      // this directory row) — undo the directory write too, so a failed
      // "Add staff" never leaves behind a record that looks fine in the
      // list but can't actually sign in.
      await dbSync.deleteRow(STORAGE_KEYS.STAFF, record.id).catch(() => {});
      await saveAllStaff(list);
      throw new Error(humanizeServerError(err));
    }
  }
  return record;
}

export async function updateStaff(id, updates) {
  const { password, confirmPassword, ...fields } = updates;
  const list = getAllStaff();

  if (Object.keys(fields).length) {
    await dbSync.updateRow(STORAGE_KEYS.STAFF, id, fields);
  }
  const updated = list.map((s) => (s.id === id ? { ...s, ...fields } : s));
  await saveAllStaff(updated);
  const record = updated.find((s) => s.id === id);

  if (password) {
    // Either reset an existing portal account's password, or create the
    // account now if this member never had one.
    try {
      await setStaffPassword({ data: { staffId: id, password } });
    } catch (err) {
      if (!record?.email) {
        throw new Error("An email address is required to create a portal login.");
      }
      try {
        await createStaffAccount({
          data: { staffId: id, email: record.email, password, name: record.name },
        });
      } catch (createErr) {
        throw new Error(humanizeServerError(createErr));
      }
      void err; // setStaffPassword's failure was expected (no account yet); createStaffAccount's result is what matters
    }
  }
  return record;
}

export async function deleteStaff(id) {
  const list = getAllStaff();
  await dbSync.deleteRow(STORAGE_KEYS.STAFF, id);
  await saveAllStaff(list.filter((s) => s.id !== id));
  try {
    await deleteStaffAccount({ data: { staffId: id } });
  } catch {
    // the directory row is gone either way; the login account may simply
    // never have existed
  }
}

export async function setStaffStatus(id, status) {
  return updateStaff(id, { status });
}

// Fields a Staff member is allowed to change about themselves from
// /staff/profile. Everything else (role, department, status, login id,
// assignments) stays admin-controlled.
const SELF_EDITABLE_FIELDS = ["email", "phone"];

export async function updateStaffSelf(id, updates) {
  const safeUpdates = {};
  for (const field of SELF_EDITABLE_FIELDS) {
    if (field in updates) safeUpdates[field] = updates[field];
  }
  return updateStaff(id, safeUpdates);
}

// A staff member changing their own password goes straight through the auth
// service with their current password — the app never stores passwords.
export async function changeStaffPassword(id, currentPassword, newPassword) {
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: "New password must be at least 6 characters." };
  }
  try {
    await apiFetch("/auth/change-password", { method: "POST", body: { currentPassword, newPassword } });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: /current password/i.test(err.message) ? "Current password is incorrect." : err.message,
    };
  }
}

function pickColor(index) {
  const palette = ["#120D9E", "#13A870", "#E14868", "#2E90E2", "#E29A2E", "#5451B9"];
  return palette[index % palette.length];
}
