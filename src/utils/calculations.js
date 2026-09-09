// Reusable attendance calculation engine. Every screen that needs
// attendance numbers (dashboard, staff detail, reports, calendar)
// pulls from these functions so the math only lives in one place.
import { ATTENDANCE_STATUS } from "../constants/storageKeys";
import { parseTimeToMinutes, minutesOfDayFromISO, formatDuration, startOfWeek, toISODate } from "./dateUtils";

export function filterRecords(records, { staffId, department, staffById, from, to, status } = {}) {
  return records.filter((r) => {
    if (staffId && r.staffId !== staffId) return false;
    if (department && staffById) {
      const s = staffById[r.staffId];
      if (!s || s.department !== department) return false;
    }
    if (from && r.date < from) return false;
    if (to && r.date > to) return false;
    if (status && r.status !== status) return false;
    return true;
  });
}

export function calculatePresentCount(records) {
  return records.filter(
    (r) => r.status === ATTENDANCE_STATUS.PRESENT || r.status === ATTENDANCE_STATUS.LATE || r.status === ATTENDANCE_STATUS.HALF_DAY
  ).length;
}

export function calculateLeaveCount(records) {
  return records.filter((r) => r.status === ATTENDANCE_STATUS.LEAVE).length;
}

export function calculateLateCount(records) {
  return records.filter((r) => r.status === ATTENDANCE_STATUS.LATE).length;
}

// Counts records whose *logout* was early (independent of the overall daily
// status), driven off the same logoutStatus stamped by clockOut/correctRecord.
export function calculateEarlyLogoutCount(records) {
  return records.filter((r) => r.logoutStatus === "early").length;
}

export function calculateTotalClasses(records) {
  // "Total marked days" — kept generically named to mirror the reference
  // app's total-sessions concept, applied here to total marked shifts.
  return records.length;
}

export function calculateAttendancePercentage(records) {
  const total = records.length;
  if (total === 0) return 0;
  const present = calculatePresentCount(records);
  return (present / total) * 100;
}

export function calculateShortage(records, requiredPercentage = 75) {
  const total = records.length;
  const present = calculatePresentCount(records);
  const currentPct = total === 0 ? 100 : (present / total) * 100;
  if (currentPct >= requiredPercentage || total === 0) return { short: false, daysNeeded: 0, currentPct };
  // How many more consecutive present days needed to reach requiredPercentage
  let daysNeeded = 0;
  let p = present;
  let t = total;
  while ((p / t) * 100 < requiredPercentage) {
    p += 1;
    t += 1;
    daysNeeded += 1;
    if (daysNeeded > 10000) break;
  }
  return { short: true, daysNeeded, currentPct };
}

export function calculateWorkedMinutes(record) {
  if (!record.clockIn || !record.clockOut) return null;
  const inTime = new Date(record.clockIn).getTime();
  const outTime = new Date(record.clockOut).getTime();
  if (Number.isNaN(inTime) || Number.isNaN(outTime) || outTime < inTime) return null;
  return Math.round((outTime - inTime) / 60000);
}

// ── Attendance rules engine ────────────────────────────────────────────────
// All login/logout/working-hour math lives here, driven entirely by the
// admin-configurable settings object (see settingsService). Nothing in this
// file hard-codes a time — every screen that needs these numbers (staff
// dashboard, staff mark-attendance, admin attendance table/dashboard) calls
// into these same functions so the rules only ever live in one place.

// Login status against settings.loginTime + settings.graceMinutes.
// e.g. loginTime 9:30, grace 15 -> on time at/before 9:30, grace period
// 9:31-9:45, late after 9:45.
export function computeLoginStatus(clockInIso, settings) {
  if (!clockInIso) return null;
  const loginMinutes = minutesOfDayFromISO(clockInIso);
  const scheduledMinutes = parseTimeToMinutes(settings?.loginTime);
  const thresholdMinutes = scheduledMinutes + (settings?.graceMinutes || 0);
  const isLate = loginMinutes > thresholdMinutes;
  const isGrace = !isLate && loginMinutes > scheduledMinutes;
  return {
    status: isLate ? "late" : isGrace ? "grace" : "on_time",
    lateMinutes: isLate ? loginMinutes - thresholdMinutes : 0,
    graceMinutes: isGrace ? loginMinutes - scheduledMinutes : 0,
    scheduledMinutes,
    loginMinutes,
  };
}

// Logout status against settings.logoutTime / settings.logoutMaxTime.
// Before logoutTime -> early. Between logoutTime and logoutMaxTime (inclusive
// of both ends) -> normal. After logoutMaxTime -> expired.
export function computeLogoutStatus(clockOutIso, settings) {
  if (!clockOutIso) return null;
  const outMinutes = minutesOfDayFromISO(clockOutIso);
  const scheduledMinutes = parseTimeToMinutes(settings?.logoutTime);
  const maxMinutes = parseTimeToMinutes(settings?.logoutMaxTime);
  if (outMinutes < scheduledMinutes) {
    return { status: "early", earlyMinutes: scheduledMinutes - outMinutes };
  }
  if (outMinutes <= maxMinutes) {
    return { status: "normal", earlyMinutes: 0 };
  }
  return { status: "expired", earlyMinutes: 0 };
}

export function getRequiredMinutes(settings) {
  return settings?.requiredWorkMinutes ?? 510;
}

// Full set of attendance-rule fields for a record: login/logout status,
// late/early minutes, worked/required minutes and the working-hour
// difference. Used both to persist final values (on clock-in/clock-out, or
// an admin correction) and to render the same numbers live in the UI.
export function computeAttendanceMetrics(record, settings) {
  const login = record?.clockIn ? computeLoginStatus(record.clockIn, settings) : null;
  const logout = record?.clockOut ? computeLogoutStatus(record.clockOut, settings) : null;
  const requiredMinutes = getRequiredMinutes(settings);
  const workedMinutes = record ? calculateWorkedMinutes(record) : null;
  const workingHoursDiff = workedMinutes == null ? null : workedMinutes - requiredMinutes;
  // "Live" worked minutes: same as workedMinutes once clocked out, but keeps
  // ticking from clockIn -> now while a shift is still open, so progress /
  // remaining / extra numbers stay accurate through refreshes and navigation
  // (driven off the stored timestamp, not a frontend-only counter).
  const liveWorkedMinutes = record?.clockIn
    ? record?.clockOut
      ? workedMinutes
      : Math.max(0, Math.round((Date.now() - new Date(record.clockIn).getTime()) / 60000))
    : null;
  return {
    loginStatus: login?.status ?? null,
    lateMinutes: login?.lateMinutes ?? 0,
    graceMinutes: login?.graceMinutes ?? 0,
    scheduledLoginMinutes: login?.scheduledMinutes ?? null,
    actualLoginMinutes: login?.loginMinutes ?? null,
    logoutStatus: logout?.status ?? null,
    earlyMinutes: logout?.earlyMinutes ?? 0,
    workedMinutes,
    liveWorkedMinutes,
    requiredMinutes,
    workingHoursDiff,
    remainingMinutes: calculateRemainingMinutes(liveWorkedMinutes, requiredMinutes),
    extraMinutes: calculateExtraMinutes(liveWorkedMinutes, requiredMinutes),
    workingProgress: calculateWorkingProgress(liveWorkedMinutes, requiredMinutes),
    workingStatus: computeWorkingStatus(record, liveWorkedMinutes, requiredMinutes),
  };
}

// Minutes still needed to hit the required work minutes; 0 once complete.
export function calculateRemainingMinutes(workedMinutes, requiredMinutes) {
  if (workedMinutes == null || requiredMinutes == null) return null;
  return Math.max(0, requiredMinutes - workedMinutes);
}

// Minutes worked beyond the requirement; 0 until it's exceeded.
export function calculateExtraMinutes(workedMinutes, requiredMinutes) {
  if (workedMinutes == null || requiredMinutes == null) return 0;
  return Math.max(0, workedMinutes - requiredMinutes);
}

// 0-100 progress toward the required working hours (capped at 100).
export function calculateWorkingProgress(workedMinutes, requiredMinutes) {
  if (!workedMinutes || !requiredMinutes) return 0;
  return Math.min(100, Math.round((workedMinutes / requiredMinutes) * 100));
}

// One of: not_started | working | completed | logged_out | incomplete
export function computeWorkingStatus(record, liveWorkedMinutes, requiredMinutes) {
  if (!record?.clockIn) return "not_started";
  if (record?.clockOut) {
    return liveWorkedMinutes != null && requiredMinutes != null && liveWorkedMinutes < requiredMinutes
      ? "incomplete"
      : "logged_out";
  }
  if (liveWorkedMinutes != null && requiredMinutes != null && liveWorkedMinutes >= requiredMinutes) return "completed";
  return "working";
}

// A simple, transparent 0-100 attendance score for a single day: on-time
// login, required hours completed and a normal logout each contribute a
// configurable share. Purely informational — never tied to pay or discipline.
export function calculateAttendanceScore(metrics, weights = { login: 40, hours: 40, logout: 20 }) {
  if (!metrics || !metrics.loginStatus) return null;
  let score = 0;
  if (metrics.loginStatus === "on_time") score += weights.login;
  else if (metrics.loginStatus === "grace") score += weights.login * 0.75;
  else if (metrics.loginStatus === "late") score += Math.max(0, weights.login - metrics.lateMinutes);

  if (metrics.requiredMinutes) {
    const hoursRatio = Math.min(1, (metrics.liveWorkedMinutes ?? metrics.workedMinutes ?? 0) / metrics.requiredMinutes);
    score += weights.hours * hoursRatio;
  }

  if (metrics.logoutStatus === "normal") score += weights.logout;
  else if (metrics.logoutStatus === "early") score += Math.max(0, weights.logout - metrics.earlyMinutes / 2);
  else if (metrics.logoutStatus === "expired") score += weights.logout * 0.5;
  else if (!metrics.logoutStatus && metrics.workingStatus === "working") score += weights.logout * 0.5;

  return Math.round(Math.max(0, Math.min(100, score)));
}

// Friendly, informational one-liner about how today is going.
export function generateDailyInsight(metrics) {
  if (!metrics || !metrics.loginStatus) return "You haven't clocked in yet today.";
  if (metrics.workingStatus === "completed" || metrics.workingStatus === "logged_out") {
    if (metrics.extraMinutes > 0) return `Great! You completed your required hours, with ${formatDuration(metrics.extraMinutes)} extra.`;
    if (metrics.workingStatus === "incomplete") return `You are ${formatDuration(metrics.remainingMinutes)} short of today's required hours.`;
    return "Great! You completed your required hours.";
  }
  if (metrics.loginStatus === "late" && metrics.lateMinutes > 0) {
    return `You arrived ${metrics.lateMinutes} minute${metrics.lateMinutes === 1 ? "" : "s"} late today. You're on track to complete your required hours.`;
  }
  if (metrics.remainingMinutes) {
    return `You're on track to complete your required hours — ${formatDuration(metrics.remainingMinutes)} to go.`;
  }
  return "You're on track to complete your required hours.";
}

// Consecutive days ending today/yesterday matching a predicate over each
// day's computed metrics — used for both the on-time streak and the
// hours-completed streak.
function computeConsecutiveStreak(records, settings, predicate) {
  const byDate = Object.fromEntries(records.map((r) => [r.date, r]));
  let streak = 0;
  const cursor = new Date();
  const todayKey = toISODate(cursor);
  if (!byDate[todayKey]) cursor.setDate(cursor.getDate() - 1);
  for (let i = 0; i < 365; i++) {
    const iso = toISODate(cursor);
    const r = byDate[iso];
    if (!r) break;
    const metrics = computeAttendanceMetrics(r, settings);
    if (predicate(metrics, r)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }
  return streak;
}

export function calculateOnTimeStreak(records, settings) {
  return computeConsecutiveStreak(records, settings, (m) => m.loginStatus === "on_time" || m.loginStatus === "grace");
}

export function calculateCompletedStreak(records, settings) {
  return computeConsecutiveStreak(
    records,
    settings,
    (m) => m.requiredMinutes != null && (m.workedMinutes ?? m.liveWorkedMinutes ?? 0) >= m.requiredMinutes
  );
}

// Compact weekly rollup for the staff dashboard's "This Week" card.
export function calculateWeeklySummary(records, settings) {
  const from = startOfWeek();
  const weekRecords = records.filter((r) => r.date >= from);
  const requiredMinutes = getRequiredMinutes(settings);
  let totalWorked = 0;
  let lateDays = 0;
  let earlyLogoutDays = 0;
  let workingDays = 0;
  weekRecords.forEach((r) => {
    const metrics = computeAttendanceMetrics(r, settings);
    if (metrics.workedMinutes != null) {
      totalWorked += metrics.workedMinutes;
      workingDays += 1;
    }
    if (metrics.loginStatus === "late") lateDays += 1;
    if (metrics.logoutStatus === "early") earlyLogoutDays += 1;
  });
  return {
    workingDays,
    totalWorkedMinutes: totalWorked,
    averageDailyMinutes: workingDays ? Math.round(totalWorked / workingDays) : 0,
    lateDays,
    earlyLogoutDays,
    requiredMinutes: requiredMinutes * (workingDays || 0),
  };
}

export function summarize(records) {
  return {
    total: calculateTotalClasses(records),
    present: calculatePresentCount(records),
    leave: calculateLeaveCount(records),
    late: calculateLateCount(records),
    percentage: calculateAttendancePercentage(records),
  };
}

// Full attendance-analytics summary for one staff member over a set of
// records (e.g. a month, or all-time) — powers the admin "Particular User
// Details" page, the individual/monthly Excel report summary block, and the
// staff member's own "My Attendance" self-service view.
export function summarizeStaffAttendance(records, settings) {
  const totalWorkingDays = records.length;
  const present = calculatePresentCount(records);
  const leave = calculateLeaveCount(records);
  const late = calculateLateCount(records);
  const earlyLogout = calculateEarlyLogoutCount(records);
  const attendancePercentage = calculateAttendancePercentage(records);

  let totalWorkedMinutes = 0;
  let workedDaysCount = 0;
  let loginMinutesSum = 0;
  let loginCount = 0;
  let logoutMinutesSum = 0;
  let logoutCount = 0;

  records.forEach((r) => {
    const metrics = computeAttendanceMetrics(r, settings);
    if (metrics.workedMinutes != null) {
      totalWorkedMinutes += metrics.workedMinutes;
      workedDaysCount += 1;
    }
    if (metrics.actualLoginMinutes != null) {
      loginMinutesSum += metrics.actualLoginMinutes;
      loginCount += 1;
    }
    if (r.clockOut) {
      logoutMinutesSum += minutesOfDayFromISO(r.clockOut);
      logoutCount += 1;
    }
  });

  return {
    totalWorkingDays,
    present,
    leave,
    late,
    earlyLogout,
    attendancePercentage,
    totalWorkedMinutes,
    averageWorkedMinutes: workedDaysCount ? Math.round(totalWorkedMinutes / workedDaysCount) : 0,
    averageLoginMinutes: loginCount ? Math.round(loginMinutesSum / loginCount) : null,
    averageLogoutMinutes: logoutCount ? Math.round(logoutMinutesSum / logoutCount) : null,
  };
}

// Formats "minutes since midnight" (e.g. from averageLoginMinutes above) as
// a "9:14 AM" style clock time.
export function formatMinutesOfDay(minutes) {
  if (minutes == null || Number.isNaN(minutes)) return "--:--";
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.round(minutes % 60);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export function groupByDate(records) {
  const map = {};
  records.forEach((r) => {
    if (!map[r.date]) map[r.date] = [];
    map[r.date].push(r);
  });
  return map;
}

export function groupByStaff(records) {
  const map = {};
  records.forEach((r) => {
    if (!map[r.staffId]) map[r.staffId] = [];
    map[r.staffId].push(r);
  });
  return map;
}

export function trendByDay(records, days) {
  const byDate = groupByDate(records);
  return days.map((iso) => {
    const dayRecords = byDate[iso] || [];
    const s = summarize(dayRecords);
    return { date: iso, ...s };
  });
}
