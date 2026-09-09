// Clock-out is only allowed from 6:00 PM local time onward.
export const CLOCK_OUT_ALLOWED_HOUR = 18;

export function isClockOutAllowedNow(date = new Date()) {
  return date.getHours() >= CLOCK_OUT_ALLOWED_HOUR;
}

export function todayISO() {
  return toISODate(new Date());
}

export function toISODate(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDisplayDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(isoTimestamp) {
  if (!isoTimestamp) return "--:--";
  const d = new Date(isoTimestamp);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function formatDuration(minutes) {
  if (minutes == null || Number.isNaN(minutes)) return "--";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m`;
}

export function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

export function getMonthMatrix(year, month) {
  // Returns array of weeks, each week an array of {date, iso, inMonth}
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay(); // 0=Sun
  const totalDays = daysInMonth(year, month);
  const cells = [];

  for (let i = 0; i < startOffset; i++) {
    const d = new Date(year, month, i - startOffset + 1);
    cells.push({ date: d, iso: toISODate(d), inMonth: false });
  }
  for (let day = 1; day <= totalDays; day++) {
    const d = new Date(year, month, day);
    cells.push({ date: d, iso: toISODate(d), inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    const d = new Date(last);
    d.setDate(d.getDate() + 1);
    cells.push({ date: d, iso: toISODate(d), inMonth: false });
  }

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function isWeekend(iso) {
  const d = new Date(iso + "T00:00:00");
  const day = d.getDay();
  return day === 0 || day === 6;
}

export function startOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return toISODate(d);
}

export function addDays(iso, n) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

// Parses a "HH:mm" setting string (e.g. "09:30") into minutes since midnight.
export function parseTimeToMinutes(hhmm) {
  if (!hhmm || typeof hhmm !== "string") return 0;
  const [h, m] = hhmm.split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

// Minutes since local midnight for a stored ISO timestamp — used to compare
// a clock-in/out moment against a "HH:mm" attendance rule setting.
export function minutesOfDayFromISO(isoTimestamp) {
  if (!isoTimestamp) return null;
  const d = new Date(isoTimestamp);
  if (Number.isNaN(d.getTime())) return null;
  return d.getHours() * 60 + d.getMinutes();
}

// Combines a "YYYY-MM-DD" date and a "HH:mm" time (both local) into the same
// ISO timestamp format the rest of the app stores on attendance records.
export function combineDateAndTime(dateISO, hhmm) {
  if (!dateISO || !hhmm) return null;
  const d = new Date(`${dateISO}T${hhmm}:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

// A signed duration string like "+8h 30m" or "-0h 15m" for showing
// worked-vs-required working hour differences.
export function formatDiffDuration(minutes) {
  if (minutes == null || Number.isNaN(minutes)) return "--";
  const sign = minutes < 0 ? "-" : "+";
  return `${sign}${formatDuration(Math.abs(minutes))}`;
}

export function lastNDays(n) {
  const days = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(toISODate(d));
  }
  return days;
}
