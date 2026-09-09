import { getData } from "./storageService";
import { STORAGE_KEYS } from "../constants/storageKeys";
import { generateId } from "../utils/idGenerator";
import { syncCollection, persistCollection } from "./sheetsSync";

const DEFAULT_DEPARTMENTS = [
  { id: "dep_seed1", name: "Operations" },
  { id: "dep_seed2", name: "Retail" },
  { id: "dep_seed3", name: "Logistics" },
  { id: "dep_seed4", name: "IT Team" },
  { id: "dep_seed5", name: "Editing Team" },
];

export function getAllDepartments() {
  return getData(STORAGE_KEYS.DEPARTMENTS, DEFAULT_DEPARTMENTS);
}

// Pulls the shared department list down from the Sheets backend (when
// configured) into the local cache. Call once on mount — see useDepartments.
export function syncDepartments() {
  return syncCollection(STORAGE_KEYS.DEPARTMENTS, DEFAULT_DEPARTMENTS);
}

export async function saveAllDepartments(list) {
  return persistCollection(STORAGE_KEYS.DEPARTMENTS, list);
}

export async function addDepartment(name) {
  const list = getAllDepartments();
  const record = { id: generateId("dep"), name: name.trim() };
  await saveAllDepartments([...list, record]);
  return record;
}

export async function updateDepartment(id, name) {
  const list = getAllDepartments();
  const updated = list.map((d) => (d.id === id ? { ...d, name: name.trim() } : d));
  await saveAllDepartments(updated);
}

export async function deleteDepartment(id) {
  const list = getAllDepartments();
  await saveAllDepartments(list.filter((d) => d.id !== id));
}
