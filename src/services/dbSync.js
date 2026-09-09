// Backend-backed replacement for the old Supabase sync layer.
//
// Every collection service in this app (staff, departments, holidays, leave
// types/reasons, leaves, login activity, attendance) keeps a synchronous
// LocalStorage cache for reads and calls syncCollection()/persistCollection()
// to talk to the shared backend. This module implements those two
// operations against the MongoDB/Express API instead of Supabase — the REST
// resource paths line up 1:1 with the old table names, and record shapes
// are already camelCase end-to-end (no snake_case column mapping needed).
//
// Authorization is enforced server-side (see /server/src/routes) the same
// way row-level security used to be: a Staff session simply never receives
// or is able to write another member's rows, even though it calls the same
// code as an Admin session.
import { apiFetch } from "../lib/apiClient";
import { STORAGE_KEYS } from "../constants/storageKeys";

const RESOURCE_PATHS = {
  [STORAGE_KEYS.STAFF]: "/staff",
  [STORAGE_KEYS.DEPARTMENTS]: "/departments",
  [STORAGE_KEYS.HOLIDAYS]: "/holidays",
  [STORAGE_KEYS.LEAVE_TYPES]: "/leave-types",
  [STORAGE_KEYS.LEAVE_REASONS]: "/leave-reasons",
  [STORAGE_KEYS.LEAVES]: "/leaves",
  [STORAGE_KEYS.SESSIONS]: "/login-events",
  [STORAGE_KEYS.ATTENDANCE]: "/attendance",
};

// Login activity is an append-only audit trail — never bulk-replaced.
const APPEND_ONLY = new Set([STORAGE_KEYS.SESSIONS]);

export function isCloudCollection(key) {
  return key in RESOURCE_PATHS;
}

function resourcePath(key) {
  const path = RESOURCE_PATHS[key];
  if (!path) throw new Error(`dbSync: unknown collection "${key}"`);
  return path;
}

// Reads the whole collection from the database. Rows the signed-in user
// isn't allowed to see are simply absent (server-side authorization), which
// is exactly what each screen should render.
export async function fetchCollection(key) {
  const path = resourcePath(key);
  const data = await apiFetch(path);
  return Array.isArray(data) ? data : [];
}

// Writes the whole collection: upserts every record and removes rows that
// are no longer present (except for append-only audit collections).
export async function saveCollection(key, list) {
  const path = resourcePath(key);
  const records = (Array.isArray(list) ? list : []).filter((r) => r.id);
  if (APPEND_ONLY.has(key)) return records;
  await apiFetch(path, { method: "PUT", body: { records } });
  return records;
}

// Best-effort single-row write for append-only audit collections (login
// activity) and for services that write one record at a time rather than
// re-uploading the whole cached collection.
export async function insertRow(key, record) {
  const path = resourcePath(key);
  if (!record?.id) return;
  await apiFetch(path, { method: "POST", body: record });
}

export async function updateRow(key, id, patch) {
  const path = resourcePath(key);
  if (!patch || !Object.keys(patch).length) return;
  await apiFetch(`${path}/${encodeURIComponent(id)}`, { method: "PATCH", body: patch });
}

export async function deleteRow(key, id) {
  const path = resourcePath(key);
  await apiFetch(`${path}/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ---- Settings (single key/value row) ----

export async function fetchSettings() {
  const { value } = await apiFetch("/settings");
  return value || {};
}

export async function saveSettingsToCloud(value) {
  await apiFetch("/settings", { method: "PUT", body: { value } });
  return value;
}
