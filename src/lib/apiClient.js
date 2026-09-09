// Thin fetch wrapper for the MongoDB/Express backend that replaced Supabase.
// Attaches the signed-in user's JWT (if any) and normalizes error handling
// so every service can just `await apiFetch(...)`.
import { getData } from "../services/storageService";
import { STORAGE_KEYS } from "../constants/storageKeys";

const BASE_URL = (import.meta.env["VITE_API_URL"] || "http://localhost:4000/api").replace(/\/$/, "");

export function getToken() {
  return getData(STORAGE_KEYS.AUTH_TOKEN, null);
}

export async function apiFetch(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Could not reach the server. Check your connection and try again.");
  }

  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const payload = isJson ? await res.json().catch(() => ({})) : null;

  if (!res.ok) {
    const message = payload?.error || `Request failed (${res.status}).`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return payload;
}
