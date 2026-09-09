import { getData, setData } from "./storageService";
import { STORAGE_KEYS } from "../constants/storageKeys";

const BACKUP_VERSION = "1.0.0";

export function exportBackup() {
  const payload = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      staff: getData(STORAGE_KEYS.STAFF, []),
      departments: getData(STORAGE_KEYS.DEPARTMENTS, []),
      attendance: getData(STORAGE_KEYS.ATTENDANCE, []),
      settings: getData(STORAGE_KEYS.SETTINGS, {}),
    },
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `attendance-tracker-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function validateBackupShape(json) {
  if (!json || typeof json !== "object") return "File is not valid JSON.";
  if (!json.version) return "Backup file is missing a version.";
  if (!json.data || typeof json.data !== "object") return "Backup file is missing its data section.";
  const required = ["staff", "departments", "attendance", "settings"];
  for (const key of required) {
    if (!(key in json.data)) return `Backup file is missing "${key}" data.`;
  }
  if (!Array.isArray(json.data.staff) || !Array.isArray(json.data.departments) || !Array.isArray(json.data.attendance)) {
    return "Backup file structure does not match the expected format.";
  }
  return null;
}

export function importBackup(json) {
  const error = validateBackupShape(json);
  if (error) return { success: false, error };
  setData(STORAGE_KEYS.STAFF, json.data.staff);
  setData(STORAGE_KEYS.DEPARTMENTS, json.data.departments);
  setData(STORAGE_KEYS.ATTENDANCE, json.data.attendance);
  setData(STORAGE_KEYS.SETTINGS, json.data.settings);
  return { success: true };
}

export function readFileAsJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result));
      } catch {
        reject(new Error("This file is not valid JSON."));
      }
    };
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsText(file);
  });
}

export function clearAllAppData() {
  setData(STORAGE_KEYS.STAFF, []);
  setData(STORAGE_KEYS.DEPARTMENTS, []);
  setData(STORAGE_KEYS.ATTENDANCE, []);
}

export function exportRecordsAsCSV(rows, columns, filename) {
  const header = columns.map((c) => `"${c.label}"`).join(",");
  const lines = rows.map((row) =>
    columns.map((c) => `"${String(row[c.key] ?? "").replace(/"/g, '""')}"`).join(",")
  );
  const csv = [header, ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
