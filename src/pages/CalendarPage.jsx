import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, Sparkles, X } from "lucide-react";
import Card from "../components/common/Card";
import Select from "../components/common/Select";
import EmptyState from "../components/common/EmptyState";
import { LocationBadge } from "../components/common/LocationBadge";
import { useAttendance } from "../hooks/useAttendance";
import { useStaff } from "../hooks/useStaff";
import { getMonthMatrix, isWeekend, todayISO, formatTime, formatDuration, formatDisplayDate } from "../utils/dateUtils";
import { groupByDate } from "../utils/calculations";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// Single source of truth for the day-cell / legend colors, matching the
// app-wide status palette (green/red/orange/blue/purple/slate) plus a
// separate neutral tone for holiday/weekend cells.
const DAY_STYLES = {
  present: "bg-moss-light text-moss",
  late: "bg-rust-light text-rust",
  early_logout: "bg-honey-light text-honey",
  working: "bg-sky-light text-sky",
  leave: "bg-violet-100 text-violet-600",
  not_logged: "bg-slate-100 text-slate-500",
  holiday: "bg-brass-50 text-brass-500",
  future: "text-ink-400",
};

const LEGEND = [
  { key: "present", label: "Present", dot: "bg-moss" },
  { key: "late", label: "Late", dot: "bg-rust" },
  { key: "early_logout", label: "Early Logout", dot: "bg-honey" },
  { key: "working", label: "Working", dot: "bg-sky" },
  { key: "leave", label: "Leave", dot: "bg-violet-500" },
  { key: "not_logged", label: "Not Logged In", dot: "bg-slate-400" },
  { key: "holiday", label: "Holiday/Weekend", dot: "bg-brass-400" },
];

// Resolves a single day's dominant status for a given set of records
// (either one staff member's single record, or every staff member's
// records on that day when "All staff" is selected).
function resolveDayStatus(dayRecords, iso, today) {
  if (isWeekend(iso)) return "holiday";
  if (dayRecords.length === 0) return iso <= today ? "not_logged" : "future";
  const hasLate = dayRecords.some((r) => r.loginStatus === "late");
  if (hasLate) return "late";
  const leaveCount = dayRecords.filter((r) => r.status === "leave").length;
  const presentish = dayRecords.filter((r) => r.status === "present" || r.status === "half_day").length;
  if (leaveCount > 0 && leaveCount >= presentish) return "leave";
  const working = dayRecords.some((r) => r.clockIn && !r.clockOut);
  if (working) return "working";
  const earlyLogout = dayRecords.some((r) => r.logoutStatus === "early");
  if (earlyLogout) return "early_logout";
  return "present";
}

function DetailRow({ record, staffName }) {
  const remaining = record.requiredMinutes != null && record.workedMinutes != null
    ? Math.max(0, record.requiredMinutes - record.workedMinutes)
    : null;
  const overtime = record.workingHoursDiff != null ? Math.max(0, record.workingHoursDiff) : 0;
  return (
    <div className="rounded-card border border-ink-100 p-3.5 space-y-2.5">
      {staffName && <p className="text-sm font-medium text-ink">{staffName}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-medium text-ink-400 mb-1">Login</p>
          <p className="text-sm font-mono tabular text-ink">{formatTime(record.clockIn)}</p>
          {record.loginStatus === "late" && <p className="text-[11px] text-rust font-medium">Late by {record.lateMinutes}m</p>}
          {record.loginStatus === "grace" && <p className="text-[11px] text-honey font-medium">Grace period</p>}
          {record.loginStatus === "on_time" && <p className="text-[11px] text-moss font-medium">On time</p>}
          <div className="mt-1"><LocationBadge location={record.clockInLocation} /></div>
        </div>
        <div>
          <p className="text-[10px] font-medium text-ink-400 mb-1">Logout</p>
          <p className="text-sm font-mono tabular text-ink">{formatTime(record.clockOut)}</p>
          {record.logoutStatus === "early" && <p className="text-[11px] text-honey font-medium">Early by {record.earlyMinutes}m</p>}
          {record.logoutStatus === "normal" && <p className="text-[11px] text-moss font-medium">Normal logout</p>}
          {record.logoutStatus === "expired" && <p className="text-[11px] text-rust font-medium">Logout expired</p>}
          <div className="mt-1"><LocationBadge location={record.clockOutLocation} /></div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-ink-50 text-center">
        <div>
          <p className="text-[10px] text-ink-400">Working</p>
          <p className="text-xs font-mono tabular text-ink font-medium">{formatDuration(record.workedMinutes)}</p>
        </div>
        <div>
          <p className="text-[10px] text-ink-400">Required</p>
          <p className="text-xs font-mono tabular text-ink font-medium">{formatDuration(record.requiredMinutes)}</p>
        </div>
        <div>
          <p className="text-[10px] text-ink-400">Overtime</p>
          <p className="text-xs font-mono tabular text-ink font-medium">{overtime > 0 ? `+${formatDuration(overtime)}` : "--"}</p>
        </div>
      </div>
      {record.status === "leave" && <p className="text-[11px] text-violet-600 font-medium">On leave</p>}
      {remaining != null && remaining > 0 && record.status !== "leave" && (
        <p className="text-[11px] text-ink-400">{formatDuration(remaining)} remaining to reach required hours</p>
      )}
    </div>
  );
}

export default function CalendarPage() {
  const { records } = useAttendance();
  const { staff } = useStaff();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [staffId, setStaffId] = useState("");
  const [selectedDay, setSelectedDay] = useState(null);

  const scoped = staffId ? records.filter((r) => r.staffId === staffId) : records;
  const byDate = useMemo(() => groupByDate(scoped), [scoped]);
  const weeks = useMemo(() => getMonthMatrix(cursor.year, cursor.month), [cursor]);
  const today = todayISO();

  function shiftMonth(delta) {
    setCursor((c) => {
      let month = c.month + delta;
      let year = c.year;
      if (month < 0) { month = 11; year -= 1; }
      if (month > 11) { month = 0; year += 1; }
      return { year, month };
    });
    setSelectedDay(null);
  }

  const selectedRecords = selectedDay ? byDate[selectedDay] || [] : [];
  const staffById = Object.fromEntries(staff.map((s) => [s.id, s]));

  // Month-scoped records (within the visible in-month cells only), used for
  // the productivity summary strip and the "best attendance day" insight.
  const monthRecords = useMemo(() => {
    const inMonthIsos = new Set(weeks.flat().filter((c) => c.inMonth).map((c) => c.iso));
    return scoped.filter((r) => inMonthIsos.has(r.date));
  }, [scoped, weeks]);

  const monthSummary = useMemo(() => {
    let present = 0, late = 0, leave = 0, earlyLogout = 0, totalMinutes = 0, overtimeMinutes = 0;
    monthRecords.forEach((r) => {
      if (r.status === "present" || r.status === "half_day") present += 1;
      if (r.loginStatus === "late") late += 1;
      if (r.status === "leave") leave += 1;
      if (r.logoutStatus === "early") earlyLogout += 1;
      if (r.workedMinutes != null) totalMinutes += r.workedMinutes;
      if (r.workingHoursDiff > 0) overtimeMinutes += r.workingHoursDiff;
    });
    const markedStaffDays = new Set(monthRecords.map((r) => `${r.staffId}_${r.date}`));
    const notLoggedIn = staffId
      ? weeks.flat().filter((c) => c.inMonth && c.iso <= today && !isWeekend(c.iso) && !markedStaffDays.has(`${staffId}_${c.iso}`)).length
      : null;
    return { present, late, leave, earlyLogout, totalMinutes, overtimeMinutes, notLoggedIn };
  }, [monthRecords, weeks, staffId, today]);

  const bestDay = useMemo(() => {
    const withHours = monthRecords.filter((r) => r.workedMinutes != null && r.workedMinutes > 0);
    if (withHours.length === 0) return null;
    return withHours.reduce((best, r) => (r.workedMinutes > best.workedMinutes ? r : best), withHours[0]);
  }, [monthRecords]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">Calendar</h1>
          <p className="text-sm text-ink-400">Attendance overview by day</p>
        </div>
        <Select value={staffId} onChange={(e) => setStaffId(e.target.value)} className="sm:w-56">
          <option value="">All staff</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
        <Card className="p-3.5">
          <p className="text-[11px] text-ink-400 mb-1">Present</p>
          <p className="font-display text-lg font-semibold text-moss tabular">{monthSummary.present}</p>
        </Card>
        <Card className="p-3.5">
          <p className="text-[11px] text-ink-400 mb-1">Late</p>
          <p className="font-display text-lg font-semibold text-rust tabular">{monthSummary.late}</p>
        </Card>
        <Card className="p-3.5">
          <p className="text-[11px] text-ink-400 mb-1">Leave</p>
          <p className="font-display text-lg font-semibold text-violet-600 tabular">{monthSummary.leave}</p>
        </Card>
        <Card className="p-3.5">
          <p className="text-[11px] text-ink-400 mb-1">Early Logout</p>
          <p className="font-display text-lg font-semibold text-honey tabular">{monthSummary.earlyLogout}</p>
        </Card>
        <Card className="p-3.5">
          <p className="text-[11px] text-ink-400 mb-1">Total Hours</p>
          <p className="font-display text-lg font-semibold text-ink tabular">{formatDuration(monthSummary.totalMinutes)}</p>
        </Card>
        <Card className="p-3.5">
          <p className="text-[11px] text-ink-400 mb-1">Overtime</p>
          <p className="font-display text-lg font-semibold text-ink tabular">{formatDuration(monthSummary.overtimeMinutes)}</p>
        </Card>
      </div>

      {bestDay && (
        <Card className="p-3.5 flex items-center gap-2.5 bg-gradient-mesh">
          <span className="w-7 h-7 rounded-full bg-brass-100 text-brass-600 flex items-center justify-center shrink-0">
            <Sparkles size={14} />
          </span>
          <p className="text-xs font-medium text-ink-600">
            <span className="font-semibold text-ink">Best day:</span> {formatDisplayDate(bestDay.date)} — {formatDuration(bestDay.workedMinutes)} worked
            {!staffId && staffById[bestDay.staffId] ? ` by ${staffById[bestDay.staffId].name}` : ""}
          </p>
        </Card>
      )}

      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => shiftMonth(-1)} className="p-2 rounded-full hover:bg-ink-50 text-ink-500"><ChevronLeft size={18} /></button>
          <h2 className="font-display font-semibold text-sm text-ink">{MONTH_NAMES[cursor.month]} {cursor.year}</h2>
          <button onClick={() => shiftMonth(1)} className="p-2 rounded-full hover:bg-ink-50 text-ink-500"><ChevronRight size={18} /></button>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-4 pb-4 border-b border-ink-100 text-[11px] text-ink-400">
          {LEGEND.map((l) => (
            <span key={l.key} className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-full ${l.dot}`} />{l.label}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-[10px] font-medium text-ink-300 py-1.5">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {weeks.flat().map((cell) => {
            const isToday = cell.iso === today;
            const dayRecords = byDate[cell.iso] || [];
            const status = resolveDayStatus(dayRecords, cell.iso, today);
            const style = cell.inMonth ? DAY_STYLES[status] : "text-ink-200";
            const hours = dayRecords.reduce((sum, r) => sum + (r.workedMinutes || 0), 0);
            return (
              <button
                key={cell.iso}
                onClick={() => cell.inMonth && setSelectedDay(cell.iso)}
                disabled={!cell.inMonth}
                className={`aspect-square rounded-card text-xs font-medium flex flex-col items-center justify-center gap-0.5 transition-colors disabled:cursor-default hover:brightness-95 ${style} ${
                  selectedDay === cell.iso ? "ring-2 ring-brass" : ""
                } ${isToday ? "font-bold" : ""}`}
              >
                <span>{cell.date.getDate()}</span>
                {cell.inMonth && hours > 0 && (
                  <span className="text-[9px] font-normal opacity-75 tabular">{Math.round(hours / 60)}h</span>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {selectedDay && (
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-sm text-ink">{formatDisplayDate(selectedDay)}</h3>
            <button onClick={() => setSelectedDay(null)} className="p-1.5 rounded-full text-ink-400 hover:bg-ink-50 hover:text-ink">
              <X size={15} />
            </button>
          </div>
          {selectedRecords.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No records" message="No attendance was marked for this day." />
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {selectedRecords.map((r) => (
                <DetailRow key={r.id} record={r} staffName={!staffId ? staffById[r.staffId]?.name : undefined} />
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
