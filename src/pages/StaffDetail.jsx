import { useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Download, Mail, Phone, Calendar, FileWarning } from "lucide-react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import Select from "../components/common/Select";
import EmptyState from "../components/common/EmptyState";
import { LocationBadge } from "../components/common/LocationBadge";
import { LoginStatusBadge, LogoutStatusBadge } from "../components/attendance/AttendanceStatusBadges";
import { useStaff } from "../hooks/useStaff";
import { useAttendance } from "../hooks/useAttendance";
import { useSettings } from "../hooks/useSettings";
import { useToast } from "../hooks/useToast";
import { formatTime, formatDuration, formatDisplayDate } from "../utils/dateUtils";
import { computeAttendanceMetrics, summarizeStaffAttendance, formatMinutesOfDay } from "../utils/calculations";
import { exportUserAttendanceExcel } from "../services/excelService";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function StaffDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { staff } = useStaff();
  const { records } = useAttendance();
  const { settings } = useSettings();
  const toast = useToast();

  const staffMember = useMemo(() => staff.find((s) => s.id === id), [staff, id]);
  const allRecords = useMemo(() => records.filter((r) => r.staffId === id), [records, id]);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed

  const monthRecords = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    return allRecords
      .filter((r) => r.date.startsWith(prefix))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }, [allRecords, year, month]);

  const allTimeSummary = useMemo(() => summarizeStaffAttendance(allRecords, settings), [allRecords, settings]);
  const monthSummary = useMemo(() => summarizeStaffAttendance(monthRecords, settings), [monthRecords, settings]);

  const yearsAvailable = useMemo(() => {
    const years = new Set(allRecords.map((r) => Number(r.date.slice(0, 4))));
    years.add(now.getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [allRecords]); // eslint-disable-line react-hooks/exhaustive-deps

  const todayRecord = allRecords.find((r) => r.date === new Date().toISOString().slice(0, 10));

  if (!staffMember) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate("/staff")}>Back to Staff</Button>
        <Card className="p-8">
          <EmptyState icon={FileWarning} title="Staff member not found" message="They may have been removed." />
        </Card>
      </div>
    );
  }

  function handleDownloadMonth() {
    if (monthRecords.length === 0) {
      toast.error("No attendance data for this month.");
      return;
    }
    exportUserAttendanceExcel({
      staffMember,
      records: monthRecords,
      settings,
      periodLabel: `${MONTH_NAMES[month]} ${year}`,
    });
    toast.success("Excel report downloaded.");
  }

  function handleDownloadAllTime() {
    if (allRecords.length === 0) {
      toast.error("No attendance data yet.");
      return;
    }
    exportUserAttendanceExcel({
      staffMember,
      records: allRecords,
      settings,
      periodLabel: "All Time",
    });
    toast.success("Excel report downloaded.");
  }

  const summaryCards = [
    { label: "Total Working Days", value: monthSummary.totalWorkingDays },
    { label: "Present", value: monthSummary.present, color: "text-moss" },
    { label: "Late Logins", value: monthSummary.late, color: "text-rust" },
    { label: "Early Logouts", value: monthSummary.earlyLogout, color: "text-honey" },
    { label: "Attendance %", value: `${monthSummary.attendancePercentage.toFixed(1)}%` },
    { label: "Total Working Hours", value: formatDuration(monthSummary.totalWorkedMinutes) },
    { label: "Avg Working Hours", value: formatDuration(monthSummary.averageWorkedMinutes) },
    { label: "Avg Login Time", value: formatMinutesOfDay(monthSummary.averageLoginMinutes) },
    { label: "Avg Logout Time", value: formatMinutesOfDay(monthSummary.averageLogoutMinutes) },
  ];

  return (
    <div className="space-y-5">
      <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate("/staff")}>Back to Staff</Button>

      {/* Profile */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-display font-semibold text-white shrink-0"
              style={{ backgroundColor: staffMember.avatarColor || "#120D9E" }}
            >
              {staffMember.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-lg font-semibold text-ink truncate">{staffMember.name}</h1>
              <p className="text-sm text-ink-400 truncate">{staffMember.role} · {staffMember.department}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {staffMember.loginId && <Badge>ID: {staffMember.loginId}</Badge>}
                <span className={`text-[11px] font-medium ${staffMember.status === "active" ? "text-moss" : "text-rust"}`}>
                  {staffMember.status === "active" ? "Portal active" : "Portal disabled"}
                </span>
                {todayRecord ? (
                  <>
                    <LoginStatusBadge metrics={todayRecord} />
                    <LogoutStatusBadge metrics={todayRecord} />
                  </>
                ) : (
                  <Badge>Not marked today</Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-ink-400">
                {staffMember.email && <span className="flex items-center gap-1"><Mail size={12} />{staffMember.email}</span>}
                {staffMember.phone && <span className="flex items-center gap-1"><Phone size={12} />{staffMember.phone}</span>}
                {staffMember.joinDate && <span className="flex items-center gap-1"><Calendar size={12} />Joined {formatDisplayDate(staffMember.joinDate)}</span>}
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:items-end gap-2 shrink-0">
            <Button variant="outline" size="sm" icon={Download} onClick={handleDownloadAllTime}>
              Download All-Time Excel
            </Button>
            <p className="text-[11px] text-ink-400">
              All-time: {allTimeSummary.attendancePercentage.toFixed(1)}% · {allTimeSummary.totalWorkingDays} days marked
            </p>
          </div>
        </div>
      </Card>

      {/* Month selector */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="grid grid-cols-2 gap-3 w-full sm:w-auto">
            <Select label="Month" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTH_NAMES.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </Select>
            <Select label="Year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {yearsAvailable.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </Select>
          </div>
          <Button variant="accent" icon={Download} onClick={handleDownloadMonth} className="shrink-0">
            Download {MONTH_NAMES[month]} Excel
          </Button>
        </div>
      </Card>

      {/* Attendance summary */}
      <div>
        <h2 className="font-display font-semibold text-sm text-ink mb-3">
          Attendance Summary — {MONTH_NAMES[month]} {year}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {summaryCards.map((s) => (
            <Card key={s.label} className="p-4">
              <p className="text-xs text-ink-400 mb-1">{s.label}</p>
              <p className={`font-display text-lg font-semibold tabular ${s.color || "text-ink"}`}>{s.value}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Monthly table */}
      <Card className="p-4 sm:p-5">
        <h2 className="font-display font-semibold text-sm text-ink mb-4">Monthly attendance</h2>
        {monthRecords.length === 0 ? (
          <EmptyState icon={Calendar} title="No records this month" message="No attendance was marked for this staff member in this period." />
        ) : (
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-ink-100">
                  {["Date", "Day", "Login", "Logout", "Login Location", "Logout Location", "Working Hours", "Status"].map((h) => (
                    <th key={h} className="pb-2.5 text-[11px] font-medium text-ink-400 uppercase tracking-wide pr-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthRecords.map((r) => {
                  const metrics = computeAttendanceMetrics(r, settings);
                  const dayName = new Date(`${r.date}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" });
                  return (
                    <tr key={r.id} className="border-b border-ink-50 last:border-0">
                      <td className="py-2.5 pr-3 text-sm text-ink whitespace-nowrap">{r.date}</td>
                      <td className="py-2.5 pr-3 text-sm text-ink-500 whitespace-nowrap">{dayName}</td>
                      <td className="py-2.5 pr-3 text-sm font-mono tabular text-ink-500 whitespace-nowrap">{formatTime(r.clockIn)}</td>
                      <td className="py-2.5 pr-3 text-sm font-mono tabular text-ink-500 whitespace-nowrap">{formatTime(r.clockOut)}</td>
                      <td className="py-2.5 pr-3"><LocationBadge location={r.clockInLocation} /></td>
                      <td className="py-2.5 pr-3"><LocationBadge location={r.clockOutLocation} /></td>
                      <td className="py-2.5 pr-3 text-sm tabular text-ink-500 whitespace-nowrap">{formatDuration(metrics.workedMinutes)}</td>
                      <td className="py-2.5 pr-3">
                        <div className="flex flex-wrap gap-1 items-center">
                          <Badge status={r.status} />
                          <LoginStatusBadge metrics={r} />
                          <LogoutStatusBadge metrics={r} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-[11px] text-ink-300 text-center">
        Only Admin accounts can view this page — {staffMember.name} can see their own attendance at{" "}
        <Link to="/staff/history" className="underline">My Attendance</Link> when signed into the staff portal.
      </p>
    </div>
  );
}
