// Shared write-through cache helper for every service that stores a whole
// collection (Staff, Departments, Holidays, Leave Types/Reasons, Leaves,
// Login Activity, Attendance) as one JSON blob under a STORAGE_KEYS.* key.
//
// Reads stay perfectly synchronous (served from the local cache) so no
// page/component has to change how it consumes getAllX(); syncCollection()
// refreshes that cache from the Cloud database and persistCollection() writes
// a change back to both places. See dbSync.js for the table/column mapping.
import { getData, setData } from "./storageService";
import * as dbSync from "./dbSync";

export const USE_CLOUD = true;

// Call once (e.g. from a hook's mount effect) to pull the latest shared
// value for `key` down from the database and mirror it into the local cache.
// Resolves to the value now in the cache either way, so callers can just
// do `setState(await syncCollection(...))`.
export async function syncCollection(key, defaultValue) {
  try {
    const remote = await dbSync.fetchCollection(key);
    setData(key, remote);
    return remote;
  } catch (err) {
    console.error(`sync: failed to fetch collection "${key}"`, err);
    // Fall back to whatever's already cached locally rather than blocking
    // the page — the next successful sync will reconcile it.
    return getData(key, defaultValue);
  }
}

// Persists `value` for `key` to the database and mirrors it into the local
// cache. Always await this — it can fail (network/permissions), and callers
// should surface that to the user rather than silently losing the write.
export async function persistCollection(key, value) {
  const previous = getData(key, null);
  setData(key, value); // optimistic local mirror
  try {
    await dbSync.saveCollection(key, value);
  } catch (err) {
    // Roll the cache back so a rejected write never leaves a phantom row
    // on screen that isn't actually saved anywhere.
    if (previous !== null) setData(key, previous);
    throw err;
  }
  return value;
}
