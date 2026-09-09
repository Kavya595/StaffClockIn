import { useMemo } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck, History, CalendarOff, FileBarChart, UserCircle, Flame, MapPin } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAttendance } from "../../hooks/useAttendance";
import { useMyStaff } from "../../hooks/useMyStaff";
import { useSettings } from "../../hooks/useSettings";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import PunchClock from "../../components/attendance/PunchClock";
import DayTimeline from "../../components/attendance/DayTimeline";
import WorkingHoursRing from "../../components/attendance/WorkingHoursRing";
import { LoginStatusBadge, LogoutStatusBadge, WorkingStatusBadge } from "../../components/attendance/AttendanceStatusBadges";
import { LocationBadge } from "../../components/common/LocationBadge";
import { todayISO, formatDisplayDate, formatTime, formatDuration, isClockOutAllowedNow } from "../../utils/dateUtils";
import {
  calculateWorkedMinutes,
  summarize,
  computeAttendanceMetrics,
  getRequiredMinutes,
  calculateOnTimeStreak,
  calculateWeeklySummary,
  calculateAttendanceScore,
  generateDailyInsight,
} from "../../utils/calculations";
import { useToast } from "../../hooks/useToast";
import { captureLocation, isGeoSupported } from "../../utils/geo";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function StatCard({ label, value, sub, accent, chip }) {
  return (
    <Card className="p-4 relative overflow-hidden" hover>
      {chip && <span className={`absolute -top-3 -right-3 w-14 h-14 rounded-full blur-2xl opacity-30 ${chip}`} />}
      <p className="text-xs text-ink-400 mb-1.5 relative">{label}</p>
      <p className={`font-display text-xl font-semibold tabular relative ${accent || "text-ink"}`}>{value}</p>
      {sub && <p className="text-[11px] text-ink-400 mt-1 relative">{sub}</p>}
    </Card>
  );
}

export default function StaffDashboard() {
  const { user } = useAuth();
  const { staff } = useMyStaff();
  const { records, clockIn, clockOut } = useAttendance();
  const { settings } = useSettings();
  const toast = useToast();
  const today = todayISO();

  const myRecords = useMemo(() => records.filter((r) => r.staffId === user.id), [records, user.id]);
  const todayRecord = useMemo(() => myRecords.find((r) => r.date === today) || null, [myRecords, today]);
  const metrics = useMemo(() => computeAttendanceMetrics(todayRecord, settings), [todayRecord, settings]);

  const monthPrefix = today.slice(0, 7);
  const monthRecords = useMemo(() => myRecords.filter((r) => r.date.startsWith(monthPrefix)), [myRecords, monthPrefix]);
  const monthSummary = useMemo(() => summarize(monthRecords), [monthRecords]);
  const streak = useMemo(() => calculateOnTimeStreak(myRecords, settings), [myRecords, settings]);
  const weeklySummary = useMemo(() => calculateWeeklySummary(myRecords, settings), [myRecords, settings]);
  const attendanceScore = useMemo(() => calculateAttendanceScore(metrics), [metrics]);
  const dailyInsight = useMemo(() => generateDailyInsight(metrics), [metrics]);

  const recentActivity = useMemo(
    () => [...myRecords].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    [myRecords]
  );

  const worked = todayRecord ? calculateWorkedMinutes(todayRecord) : null;

  async function handleClockIn() {
    let location = null;
    if (isGeoSupported()) {
      try {
        location = await captureLocation();
      } catch {
        // location unavailable — clockIn() below still proceeds; the
        // backend (if configured) decides whether location is required.
      }
    }
    try {
      await clockIn(user.id, today, location);
      toast.success(location?.address ? `Clocked in at ${location.address.split(",")[0]}.` : "Clocked in.");
    } catch (err) {
      toast.error(err.message || "Clock in failed.");
    }
  }
  async function handleClockOut() {
    if (!isClockOutAllowedNow()) {
      toast.error("Clock out is only available after 6:00 PM.");
      return;
    }
    let location = null;
    if (isGeoSupported()) {
      try {
        location = await captureLocation();
      } catch {
        // location unavailable — proceed, same as handleClockIn above.
      }
    }
    try {
      await clockOut(user.id, today, location);
      toast.success("Clocked out.");
    } catch (err) {
      toast.error(err.message || "Clock out failed.");
    }
  }

  const firstName = user.name.split(" ")[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-ink">
          {greeting()}, {firstName} 👋
        </h1>
        <p className="text-sm text-ink-400">Here's your attendance activity for today — {formatDisplayDate(today)}.</p>
        <div className="mt-2">
          <WorkingStatusBadge status={metrics.workingStatus} />
        </div>
      </div>

      <Card className="p-5 sm:p-6 relative overflow-hidden bg-gradient-punch border-0 shadow-lift text-paper">
        <div className="absolute -top-24 -right-16 w-64 h-64 rounded-full bg-flame-500/25 blur-3xl animate-blob pointer-events-none" />
        <div className="absolute -bottom-24 -left-16 w-64 h-64 rounded-full bg-sky/20 blur-3xl animate-blob pointer-events-none" style={{ animationDelay: "2.5s" }} />
        <div className="relative flex flex-col items-center text-center gap-5 sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div
              className="w-14 h-14 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-base sm:text-sm font-display font-semibold text-white shrink-0 shadow-glow-sm ring-2 ring-white/20"
              style={{ backgroundColor: staff?.avatarColor || "#120D9E" }}
            >
              {firstName[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-sm text-ink-300 mb-1">Today's status</p>
              {todayRecord?.status ? <Badge status={todayRecord.status} /> : <Badge>Not marked yet</Badge>}
              <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 mt-2">
                <LoginStatusBadge metrics={metrics} />
                <LogoutStatusBadge metrics={metrics} />
              </div>
              <div className="flex justify-center sm:justify-start gap-4 mt-3">
                <div className="text-center sm:text-left">
                  <p className="text-[11px] text-ink-300">Clock in</p>
                  <p className="font-mono text-sm tabular text-paper">{formatTime(todayRecord?.clockIn)}</p>
                </div>
                <div className="w-px bg-white/10" />
                <div className="text-center sm:text-left">
                  <p className="text-[11px] text-ink-300">Clock out</p>
                  <p className="font-mono text-sm tabular text-paper">{formatTime(todayRecord?.clockOut)}</p>
                </div>
                <div className="w-px bg-white/10" />
                <div className="text-center sm:text-left">
                  <p className="text-[11px] text-ink-300">Worked</p>
                  <p className="font-mono text-sm tabular text-paper">{formatDuration(worked)}</p>
                  {metrics.workingHoursDiff != null && (
                    <p className={`text-[10px] mt-0.5 ${metrics.workingHoursDiff < 0 ? "text-rust" : "text-moss"}`}>
                      {metrics.workingHoursDiff < 0 ? "-" : "+"}
                      {formatDuration(Math.abs(metrics.workingHoursDiff))} vs required
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <PunchClock record={todayRecord} onClockIn={handleClockIn} onClockOut={handleClockOut} size="md" requiredMinutes={getRequiredMinutes(settings)} />
        </div>
        {(todayRecord?.clockInLocation || todayRecord?.clockOutLocation) && (
          <div className="relative flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-1.5 mt-5 pt-4 border-t border-white/10">
            {todayRecord?.clockInLocation && (
              <div className="flex items-center gap-1.5 text-[11px] text-ink-300">
                <MapPin size={12} className="text-moss" /> In: <LocationBadge location={todayRecord.clockInLocation} />
              </div>
            )}
            {todayRecord?.clockOutLocation && (
              <div className="flex items-center gap-1.5 text-[11px] text-ink-300">
                <MapPin size={12} className="text-sky" /> Out: <LocationBadge location={todayRecord.clockOutLocation} />
              </div>
            )}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-5 flex flex-col items-center justify-center">
          <WorkingHoursRing metrics={metrics} />
        </Card>

        <Card className="p-5 sm:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-display font-semibold text-sm text-ink">Today's timeline</h2>
            {attendanceScore != null && (
              <span className="text-xs font-medium text-brass-600">Attendance score: {attendanceScore}/100</span>
            )}
          </div>
          <div className="bg-ink-900 rounded-card px-2 mt-3">
            <DayTimeline record={todayRecord} requiredMinutes={getRequiredMinutes(settings)} />
          </div>
          <p className="text-xs text-ink-500 mt-3">{dailyInsight}</p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-sm text-ink">This week</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <p className="text-xs text-ink-400 mb-1">Worked</p>
            <p className="font-display text-lg font-semibold text-ink tabular">{formatDuration(weeklySummary.totalWorkedMinutes)}</p>
            <p className="text-[11px] text-ink-400">of {formatDuration(weeklySummary.requiredMinutes)} required</p>
          </div>
          <div>
            <p className="text-xs text-ink-400 mb-1">Working days</p>
            <p className="font-display text-lg font-semibold text-ink tabular">{weeklySummary.workingDays}</p>
          </div>
          <div>
            <p className="text-xs text-ink-400 mb-1">Avg / day</p>
            <p className="font-display text-lg font-semibold text-ink tabular">{formatDuration(weeklySummary.averageDailyMinutes)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-400 mb-1">Late days</p>
            <p className="font-display text-lg font-semibold text-ink tabular">{weeklySummary.lateDays}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          label={<span className="inline-flex items-center gap-1"><Flame size={11} className="text-honey" /> Current streak</span>}
          value={`${streak} day${streak === 1 ? "" : "s"}`}
          sub="Consecutive working days"
          accent="text-flame-600"
          chip="bg-flame-500"
        />
        <StatCard label="This month" value={`${monthSummary.percentage.toFixed(0)}%`} sub="Attendance rate" accent="text-brass-600" chip="bg-brass-500" />
        <StatCard label="Present" value={monthSummary.present} sub="Days this month" accent="text-moss" chip="bg-moss" />
        <StatCard label="On leave" value={monthSummary.leave} sub="Days this month" accent="text-violet-600" chip="bg-violet-500" />
      </div>

      <Card className="p-5">
        <h2 className="font-display font-semibold text-sm text-ink mb-4">Quick actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Link to="/staff/attendance" className="group flex flex-col items-center gap-2.5 px-3 py-4 rounded-card border border-ink-100 hover:border-transparent hover:shadow-brand-sm active:scale-[0.97] transition-all">
            <span className="w-10 h-10 rounded-full flex items-center justify-center bg-brass-50 text-brass-600 group-hover:bg-gradient-accent group-hover:text-white transition-colors">
              <CalendarCheck size={18} />
            </span>
            <span className="text-xs font-medium text-ink text-center">Mark attendance</span>
          </Link>
          <Link to="/staff/history" className="group flex flex-col items-center gap-2.5 px-3 py-4 rounded-card border border-ink-100 hover:border-transparent hover:shadow-brand-sm active:scale-[0.97] transition-all">
            <span className="w-10 h-10 rounded-full flex items-center justify-center bg-brass-50 text-brass-600 group-hover:bg-gradient-accent group-hover:text-white transition-colors">
              <History size={18} />
            </span>
            <span className="text-xs font-medium text-ink text-center">Working days</span>
          </Link>
          <Link to="/staff/leaves" className="group flex flex-col items-center gap-2.5 px-3 py-4 rounded-card border border-ink-100 hover:border-transparent hover:shadow-brand-sm active:scale-[0.97] transition-all">
            <span className="w-10 h-10 rounded-full flex items-center justify-center bg-brass-50 text-brass-600 group-hover:bg-gradient-accent group-hover:text-white transition-colors">
              <CalendarOff size={18} />
            </span>
            <span className="text-xs font-medium text-ink text-center">Request leave</span>
          </Link>
          <Link to="/staff/reports" className="group flex flex-col items-center gap-2.5 px-3 py-4 rounded-card border border-ink-100 hover:border-transparent hover:shadow-brand-sm active:scale-[0.97] transition-all">
            <span className="w-10 h-10 rounded-full flex items-center justify-center bg-brass-50 text-brass-600 group-hover:bg-gradient-accent group-hover:text-white transition-colors">
              <FileBarChart size={18} />
            </span>
            <span className="text-xs font-medium text-ink text-center">My reports</span>
          </Link>
          <Link to="/staff/profile" className="group flex flex-col items-center gap-2.5 px-3 py-4 rounded-card border border-ink-100 hover:border-transparent hover:shadow-brand-sm active:scale-[0.97] transition-all">
            <span className="w-10 h-10 rounded-full flex items-center justify-center bg-brass-50 text-brass-600 group-hover:bg-gradient-accent group-hover:text-white transition-colors">
              <UserCircle size={18} />
            </span>
            <span className="text-xs font-medium text-ink text-center">My profile</span>
          </Link>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-sm text-ink">Recent activity</h2>
          <Link to="/staff/history" className="text-xs font-medium text-brass-500 hover:text-brass-600">View all →</Link>
        </div>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-ink-400">No attendance recorded yet.</p>
        ) : (
          <ul className="space-y-3">
            {recentActivity.map((r) => (
              <li key={r.id} className="flex items-center justify-between text-sm gap-3">
                <span className="text-ink-500 shrink-0">{formatDisplayDate(r.date)}</span>
                <LocationBadge location={r.clockInLocation} className="hidden sm:inline-flex" />
                <Badge status={r.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
