// Thin client for the Google Apps Script backend (google-apps-script/Code.gs).
//
// IMPORTANT CORS NOTE: Apps Script Web Apps don't implement the OPTIONS
// preflight request, so this client deliberately sends the JSON body with
// Content-Type "text/plain" — that keeps every request a CORS "simple
// request" and avoids the browser ever attempting a preflight the backend
// can't answer. Do not change this to "application/json" or add custom
// headers; either one will trigger a preflight and the request will fail.
// See INTEGRATION.md for the full explanation of this Apps Script limitation.

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || "";

export function isSheetsBackendConfigured() {
  return !!APPS_SCRIPT_URL;
}

const TOKEN_STORAGE_KEY = "attendance_tracker_sheets_token";

export function getToken() {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

async function call(action, payload = {}) {
  if (!APPS_SCRIPT_URL) {
    throw new Error(
      "VITE_APPS_SCRIPT_URL is not set. Deploy google-apps-script/Code.gs and add the Web App URL to your .env file."
    );
  }
  const body = { action, token: getToken(), ...payload };

  let res;
  try {
    res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      // text/plain avoids a CORS preflight — see the note at the top of this file.
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error("Network error reaching the attendance server. Please check your connection and try again.");
  }

  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error("The attendance server returned an unexpected response.");
  }

  // The client only ever gets to see json.success / json.message / json.data —
  // never a raw exception. Apps Script errors are already normalized to this
  // shape server-side (see fail() in Code.gs).
  if (!json.success) {
    throw new Error(json.message || "Request failed.");
  }
  return json.data;
}

// ---- Auth ----
export async function login(loginId, password) {
  const data = await call("login", { loginId, password });
  setToken(data.token);
  return data.user;
}
export async function logout() {
  try {
    await call("logout");
  } finally {
    setToken(null);
  }
}
export function me() {
  return call("me");
}

// ---- Attendance ----
export function clockIn({ latitude, longitude, accuracy, address } = {}) {
  return call("clockIn", { latitude, longitude, accuracy, address });
}
export function clockOut({ latitude, longitude, accuracy, address } = {}) {
  return call("clockOut", { latitude, longitude, accuracy, address });
}
export function getTodayAttendance(date) {
  return call("getTodayAttendance", { date });
}
export function getAttendanceHistory(filters) {
  return call("getAttendanceHistory", { filters });
}
export function getEmployeeAttendance(employeeId) {
  return call("getEmployeeAttendance", { employeeId });
}
export function correctAttendance(employeeId, date, updates) {
  return call("correctAttendance", { employeeId, date, updates });
}
export function exportAttendanceCsv(filters) {
  return call("exportAttendanceCsv", { filters });
}

// ---- Employees ----
export function getEmployees() {
  return call("getEmployees");
}
export function addEmployee(employee) {
  return call("addEmployee", { employee });
}
export function updateEmployee(employeeId, updates) {
  return call("updateEmployee", { employeeId, updates });
}
export function deleteEmployee(employeeId) {
  return call("deleteEmployee", { employeeId });
}

// ---- Dashboard / Settings ----
export function getDashboardStats() {
  return call("getDashboardStats");
}
export function getSettings() {
  return call("getSettings");
}
export function saveSettings(settings) {
  return call("saveSettings", { settings });
}

// ---- Generic collections (Departments / Holidays / LeaveTypes / Leaves / Sessions) ----
export function getCollection(key) {
  return call("getCollection", { key });
}
export function setCollection(key, value) {
  return call("setCollection", { key, value });
}
