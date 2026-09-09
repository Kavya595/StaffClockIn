// Centralized, safe LocalStorage access. All reads/writes to LocalStorage
// go through this module so the rest of the app never touches
// window.localStorage directly.

function isStorageAvailable() {
  try {
    const testKey = "__storage_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export const storageAvailable = isStorageAvailable();

export function getData(key, defaultValue = null) {
  if (!storageAvailable) return defaultValue;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null || raw === undefined) return defaultValue;
    return JSON.parse(raw);
  } catch (err) {
    // Corrupted JSON — recover safely instead of crashing the app.
    console.error(`storageService: failed to parse key "${key}"`, err);
    return defaultValue;
  }
}

export function setData(key, value) {
  if (!storageAvailable) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error(`storageService: failed to set key "${key}"`, err);
    return false;
  }
}

export function removeData(key) {
  if (!storageAvailable) return false;
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch (err) {
    console.error(`storageService: failed to remove key "${key}"`, err);
    return false;
  }
}

export function clearAllData(keys) {
  if (!storageAvailable) return false;
  try {
    keys.forEach((k) => window.localStorage.removeItem(k));
    return true;
  } catch (err) {
    console.error("storageService: failed to clear data", err);
    return false;
  }
}
