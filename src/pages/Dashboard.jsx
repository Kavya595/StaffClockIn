import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Users, UserCheck, CalendarOff, ArrowUpRight, MapPin, Clock, LogOut, Timer, UserMinus, Lightbulb } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from "recharts";
import { useStaff } from "../hooks/useStaff";
import { useAttendance } from "../hooks/useAttendance";
import { useDepartments } from "../hooks/useDepartments";
import { useLeaves } from "../hooks/useLeaves";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import EmptyState from "../components/common/EmptyState";
import { LocationBadge } from "../components/common/LocationBadge";
import { todayISO, lastNDays, formatDisplayDate, formatTime, formatDuration } from "../utils/dateUtils";
import { summarize, trendByDay, calculateLateCount } from "../utils/calculations";

const CHART_FONT = { fontSize: 11, fill: "#7B7FA0" };
const TOOLTIP_STYLE = { borderRadius: 12, border: "1px solid #EAEBF3", fontSize: 12, fontFamily: "Inter", boxShadow: "0 12px 40px -8px rgba(21,24,39,0.18)" };
const STATUS_PIE_COLORS = { present: "#16A34A", leave: "#8B5CF6", late: "#EF4444", half_day: "#F59E0B" };

function StatCard({ label, value, icon: Icon, accent, sub }) {
  return (
    <Card className="p-5 flex items-start justify-between" hover>
      <div>
        <p className="text-xs font-medium text-ink-400 mb-2">{label}</p>
        <p className="font-display text-2xl font-semibold text-ink tabular">{value}</p>
        {sub && <p className="text-[11px] text-ink-400 mt-1">{sub}</p>}
      </div>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${accent}`}>
        <Icon size={18} />
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { staff } = useStaff();
  const { records } = useAttendance();
  const { departments } = useDepartments();
  const { leaves } = useLeaves();
  const today = todayISO();
  const pendingLeaveCount = useMemo(() => leaves.filter((l) => l.status === "pending").length, [leaves]);

  const todayRecords = useMemo(() => records.filter((r) => r.date === today), [records, today]);
  const todaySummary = useMemo(() => summarize(todayRecords), [todayRecords]);
  const lateToday = useMemo(() => calculateLateCount(todayRecords), [todayRecords]);
  const earlyLogoutToday = useMemo(() => todayRecords.filter((r) => r.logoutStatus === "early").length, [todayRecords]);
  const currentlyWorking = useMemo(() => todayRecords.filter((r) => r.clockIn && !r.clockOut).length, [todayRecords]);

  const staffById = useMemo(() => Object.fromEntries(staff.map((s) => [s.id, s])), [staff]);

  const days = useMemo(() => lastNDays(14), []);
  const trend = useMemo(() => trendByDay(records, days), [records, days]);
  const chartData = trend.map((t) => ({
    date: t.date.slice(5),
    Present: t.present,
    Leave: t.leave,
  }));

  const statusPieData = useMemo(() => {
    const s = todaySummary;
    return [
      { name: "Present", value: s.present, key: "present" },
      { name: "Leave", value: s.leave, key: "leave" },
      { name: "Late", value: s.late, key: "late" },
    ].filter((d) => d.value > 0);
  }, [todaySummary]);

  const departmentData = useMemo(() => {
    return departments.map((d) => {
      const deptStaffIds = new Set(staff.filter((s) => s.department === d.name).map((s) => s.id));
      const deptRecords = records.filter((r) => deptStaffIds.has(r.staffId));
      const sum = summarize(deptRecords);
      return { department: d.name, "Attendance %": Math.round(sum.percentage) };
    }).filter((d) => d["Attendance %"] > 0 || staff.some((s) => s.department === d.department));
  }, [departments, staff, records]);

  const recentActivity = useMemo(() => {
    return [...records]
      .filter((r) => r.clockIn)
      .sort((a, b) => new Date(b.clockIn) - new Date(a.clockIn))
      .slice(0, 6);
  }, [records]);

  const liveLocationsToday = useMemo(
    () => todayRecords.filter((r) => r.clockInLocation).sort((a, b) => new Date(b.clockIn) - new Date(a.clockIn)),
    [todayRecords]
  );

  const notYetMarked = staff.filter((s) => !todayRecords.some((r) => r.staffId === s.id));

  const insights = useMemo(() => {
    const list = [];
    if (currentlyWorking > 0) {
      list.push(`${currentlyWorking} employee${currentlyWorking === 1 ? " is" : "s are"} currently working.`);
    }
    const completedToday = todayRecords.filter((r) => r.clockOut && r.workingHoursDiff != null && r.workingHoursDiff >= 0).length;
    if (completedToday > 0) {
      list.push(`${completedToday} employee${completedToday === 1 ? " has" : "s have"} completed their required hours.`);
    }
    const graceToday = todayRecords.filter((r) => r.loginStatus === "grace").length;
    if (graceToday > 0) {
      list.push(`${graceToday} employee${graceToday === 1 ? " is" : "s are"} currently in the grace period.`);
    }
    const onTimeToday = todayRecords.filter((r) => r.loginStatus === "on_time").length;
    if (todayRecords.length > 0 && onTimeToday / todayRecords.length >= 0.5) {
      list.push("Most employees logged in on time today.");
    }
    const weekAgo = lastNDays(7)[0];
    const weekOvertime = records
      .filter((r) => r.date >= weekAgo && r.date <= today && r.workingHoursDiff > 0)
      .reduce((sum, r) => sum + r.workingHoursDiff, 0);
    if (weekOvertime > 0) {
      list.push(`${formatDuration(weekOvertime)} total overtime this week.`);
    }
    return list.slice(0, 4);
  }, [currentlyWorking, todayRecords, records, today]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">Dashboard</h1>
          <p className="text-sm text-ink-400">{formatDisplayDate(today)}</p>
        </div>
        <Link to="/attendance">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brass-600 hover:text-brass-500">
            Go to attendance <ArrowUpRight size={15} />
          </span>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Total Staff" value={staff.length} icon={Users} accent="bg-brass-100 text-brass-600" />
        <StatCard
          label="Present Today"
          value={todaySummary.present}
          icon={UserCheck}
          accent="bg-moss-light text-moss"
          sub={`${todaySummary.percentage.toFixed(0)}% of marked`}
        />
        <StatCard label="Not Marked Today" value={notYetMarked.length} icon={UserMinus} accent="bg-slate-100 text-slate-500" />
        <Link to="/leaves">
          <StatCard
            label="On Leave"
            value={todaySummary.leave}
            icon={CalendarOff}
            accent="bg-violet-100 text-violet-600"
            sub={pendingLeaveCount > 0 ? `${pendingLeaveCount} request${pendingLeaveCount !== 1 ? "s" : ""} pending` : undefined}
          />
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Present" value={todaySummary.present} icon={UserCheck} accent="bg-moss-light text-moss" sub="Clocked in today" />
        <StatCard label="Late" value={lateToday} icon={Clock} accent="bg-rust-light text-rust" sub="Late logins today" />
        <StatCard label="Early Logout" value={earlyLogoutToday} icon={LogOut} accent="bg-honey-light text-honey" sub="Left before schedule" />
        <StatCard label="Currently Working" value={currentlyWorking} icon={Timer} accent="bg-sky-light text-sky" sub="Clocked in, not out yet" />
      </div>

      {insights.length > 0 && (
        <Card className="p-5 bg-gradient-mesh">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-7 h-7 rounded-full bg-brass-100 text-brass-600 flex items-center justify-center shrink-0">
              <Lightbulb size={14} />
            </span>
            <h2 className="font-display font-semibold text-sm text-ink">Attendance insight</h2>
          </div>
          <ul className="flex flex-wrap gap-2">
            {insights.map((line, i) => (
              <li key={i} className="text-xs font-medium text-ink-600 bg-white/70 border border-ink-100 rounded-full px-3 py-1.5">
                {line}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-sm text-ink">Attendance — last 14 days</h2>
          </div>
          {records.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title="No attendance data yet"
              message="Mark attendance to see trends here."
            />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: -20, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16A34A" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#16A34A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EAEBF3" vertical={false} />
                  <XAxis dataKey="date" tick={CHART_FONT} axisLine={false} tickLine={false} />
                  <YAxis tick={CHART_FONT} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="Present" stroke="#16A34A" fill="url(#presentGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-display font-semibold text-sm text-ink mb-4">Today's breakdown</h2>
          {statusPieData.length === 0 ? (
            <EmptyState icon={UserCheck} title="Nothing marked yet" message="Status breakdown appears once attendance is marked." />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusPieData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={3}>
                    {statusPieData.map((d) => (
                      <Cell key={d.key} fill={STATUS_PIE_COLORS[d.key]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span className="text-xs text-ink-500">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <h2 className="font-display font-semibold text-sm text-ink mb-4">Attendance rate by department</h2>
          {departmentData.length === 0 ? (
            <EmptyState icon={Users} title="No departments yet" message="Add departments and staff to see this chart." />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentData} margin={{ left: -20, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EAEBF3" vertical={false} />
                  <XAxis dataKey="department" tick={CHART_FONT} axisLine={false} tickLine={false} />
                  <YAxis tick={CHART_FONT} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="Attendance %" fill="#120D9E" radius={[8, 8, 0, 0]} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-display font-semibold text-sm text-ink mb-4">Recent clock-ins</h2>
          {recentActivity.length === 0 ? (
            <EmptyState icon={UserCheck} title="Nothing yet" message="Clock-ins will show up here." />
          ) : (
            <ul className="space-y-3">
              {recentActivity.map((r) => {
                const s = staffById[r.staffId];
                if (!s) return null;
                return (
                  <li key={r.id} className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-display font-semibold text-white shrink-0"
                      style={{ backgroundColor: s.avatarColor || "#120D9E" }}
                    >
                      {s.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink truncate">{s.name}</p>
                      <p className="text-[11px] text-ink-400">{s.department}</p>
                    </div>
                    <span className="text-xs font-mono text-ink-500 tabular shrink-0">{formatTime(r.clockIn)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-sm text-ink flex items-center gap-1.5">
            <MapPin size={15} className="text-sky" /> Live locations — today's clock-ins
          </h2>
          <Badge>{liveLocationsToday.length} tracked</Badge>
        </div>
        {liveLocationsToday.length === 0 ? (
          <EmptyState icon={MapPin} title="No locations captured yet" message="Locations appear here as staff clock in from the portal." />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {liveLocationsToday.map((r) => {
              const s = staffById[r.staffId];
              if (!s) return null;
              return (
                <div key={r.id} className="flex items-center gap-3 px-3 py-2.5 rounded-card border border-ink-100">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-display font-semibold text-white shrink-0"
                    style={{ backgroundColor: s.avatarColor || "#120D9E" }}
                  >
                    {s.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink truncate">{s.name}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                      <span className="inline-flex items-center gap-1 text-[10px] text-ink-300 shrink-0">In:</span>
                      <LocationBadge location={r.clockInLocation} />
                      {r.clockOutLocation && (
                        <>
                          <span className="inline-flex items-center gap-1 text-[10px] text-ink-300 shrink-0">Out:</span>
                          <LocationBadge location={r.clockOutLocation} />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-sm text-ink">Not yet marked today</h2>
          <Badge>{notYetMarked.length} staff</Badge>
        </div>
        {notYetMarked.length === 0 ? (
          <EmptyState icon={UserCheck} title="Everyone is marked" message="All staff have an attendance status for today." />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {notYetMarked.map((s) => (
              <Link
                key={s.id}
                to="/attendance"
                className="flex items-center gap-3 px-3 py-2.5 rounded-card border border-ink-100 hover:border-brass hover:bg-brass-50 transition-colors"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-display font-semibold text-white shrink-0"
                  style={{ backgroundColor: s.avatarColor || "#120D9E" }}
                >
                  {s.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{s.name}</p>
                  <p className="text-[11px] text-ink-400 truncate">{s.role}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
