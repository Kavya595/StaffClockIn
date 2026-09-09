// Admin-configurable Leave Types (e.g. "Sick Leave", "Casual Leave") and
// Leave Reasons (e.g. "Family event", "Medical appointment") used to
// populate the dropdowns on the leave request form, both in the Admin
// "Leaves" page and the Staff portal's "My Leave" page.
import { getData } from "./storageService";
import { STORAGE_KEYS, LEAVE_TYPE_COLOR_PALETTE } from "../constants/storageKeys";
import { generateId } from "../utils/idGenerator";
import { syncCollection, persistCollection } from "./sheetsSync";

const DEFAULT_LEAVE_TYPES = [
  { id: "lvt_seed1", name: "Casual Leave", color: "moss", paid: true },
  { id: "lvt_seed2", name: "Sick Leave", color: "rust", paid: true },
  { id: "lvt_seed3", name: "Earned Leave", color: "honey", paid: true },
  { id: "lvt_seed4", name: "Unpaid Leave", color: "ink", paid: false },
];

const DEFAULT_LEAVE_REASONS = [
  { id: "lvr_seed1", name: "Family event" },
  { id: "lvr_seed2", name: "Medical appointment" },
  { id: "lvr_seed3", name: "Personal work" },
  { id: "lvr_seed4", name: "Travel" },
  { id: "lvr_seed5", name: "Other" },
];

// ---- Leave Types ----

export function getAllLeaveTypes() {
  return getData(STORAGE_KEYS.LEAVE_TYPES, DEFAULT_LEAVE_TYPES);
}

export function syncLeaveTypes() {
  return syncCollection(STORAGE_KEYS.LEAVE_TYPES, DEFAULT_LEAVE_TYPES);
}

export async function addLeaveType({ name, paid = true }) {
  const list = getAllLeaveTypes();
  const record = {
    id: generateId("lvt"),
    name: (name || "").trim(),
    color: LEAVE_TYPE_COLOR_PALETTE[list.length % LEAVE_TYPE_COLOR_PALETTE.length],
    paid,
  };
  const updated = [...list, record];
  await persistCollection(STORAGE_KEYS.LEAVE_TYPES, updated);
  return record;
}

export async function updateLeaveType(id, updates) {
  const list = getAllLeaveTypes();
  const updated = list.map((t) => (t.id === id ? { ...t, ...updates } : t));
  await persistCollection(STORAGE_KEYS.LEAVE_TYPES, updated);
}

export async function deleteLeaveType(id) {
  await persistCollection(STORAGE_KEYS.LEAVE_TYPES, getAllLeaveTypes().filter((t) => t.id !== id));
}

// ---- Leave Reasons ----

export function getAllLeaveReasons() {
  return getData(STORAGE_KEYS.LEAVE_REASONS, DEFAULT_LEAVE_REASONS);
}

export function syncLeaveReasons() {
  return syncCollection(STORAGE_KEYS.LEAVE_REASONS, DEFAULT_LEAVE_REASONS);
}

export async function addLeaveReason(name) {
  const list = getAllLeaveReasons();
  const record = { id: generateId("lvr"), name: (name || "").trim() };
  const updated = [...list, record];
  await persistCollection(STORAGE_KEYS.LEAVE_REASONS, updated);
  return record;
}

export async function updateLeaveReason(id, name) {
  const list = getAllLeaveReasons();
  const updated = list.map((r) => (r.id === id ? { ...r, name: name.trim() } : r));
  await persistCollection(STORAGE_KEYS.LEAVE_REASONS, updated);
}

export async function deleteLeaveReason(id) {
  await persistCollection(STORAGE_KEYS.LEAVE_REASONS, getAllLeaveReasons().filter((r) => r.id !== id));
}
