import { useMemo, useState } from "react";
import { History, MapPin } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAttendance } from "../../hooks/useAttendance";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import EmptyState from "../../components/common/EmptyState";
import { LocationBadge } from "../../components/common/LocationBadge";
import { LoginStatusBadge, LogoutStatusBadge } from "../../components/attendance/AttendanceStatusBadges";
import { formatDisplayDate, formatTime, formatDuration, lastNDays, todayISO } from "../../utils/dateUtils";
import { calculateWorkedMinutes, summarize } from "../../utils/calculations";

const RANGE_PRESETS = [
  { key: "7", label: "7 days", days: 7 },
  { key: "30", label: "30 days", days: 30 },
  { key: "90", label: "90 days", days: 90 },
  { key: "all", label: "All time", days: null },
];

export default function StaffHistory() {
  const { user } = useAuth();
  const { records } = useAttendance();

  const [preset, setPreset] = useState("30");

  const myRecords = useMemo(() => records.filter((r) => r.staffId === user.id), [records, user.id]);

  const range = RANGE_PRESETS.find((p) => p.key === preset);
  const days = useMemo(() => (range.days ? lastNDays(range.days) : null), [range.days]);
  const from = days ? days[0] : null;

  const filtered = useMemo(
    () =>
      [...myRecords]
        .filter((r) => !from || r.date >= from)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [myRecords, from]
  );

  const summary = summarize(filtered);
  const withLocation = filtered.filter((r) => r.clockInLocation).length;
  const totalWorkedMinutes = filtered.reduce((sum, r) => sum + (calculateWorkedMinutes(r) || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">My working days</h1>
          <p className="text-sm text-ink-400">Every day you've clocked in, with where you clocked in from</p>
        </div>
        <div className="inline-flex bg-ink-50 rounded-card p-1 gap-1">
          {RANGE_PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={`px-3 py-1.5 rounded-card text-xs font-medium transition-colors ${
                preset === p.key ? "bg-white text-ink shadow-card" : "text-ink-400 hover:text-ink-600"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Present", value: summary.present, color: "text-moss" },
          { label: "Late", value: summary.late, color: "text-rust" },
          { label: "On leave", value: summary.leave, color: "text-violet-600" },
          { label: "Attendance %", value: `${summary.percentage.toFixed(0)}%`, color: "text-ink-600" },
          { label: "Hours worked", value: formatDuration(totalWorkedMinutes), color: "text-sky" },
        ].map((s) => (
          <Card key={s.label} className="p-4" hover>
            <p className="text-xs text-ink-400 mb-1">{s.label}</p>
            <p className={`font-display text-lg font-semibold tabular ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {filtered.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-ink-400">
          <MapPin size={13} className="text-sky" />
          Location captured for {withLocation} of {filtered.length} working day{filtered.length === 1 ? "" : "s"}
        </div>
      )}

      <Card className="p-4 sm:p-5">
        {filtered.length === 0 ? (
          <EmptyState icon={History} title="No records found" message="Try a wider date range." />
        ) : (
          <>
            {/* Wide screens: full data table */}
            <div className="hidden md:block overflow-x-auto scroll-thin -mx-1">
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr className="border-b border-ink-100">
                    {["Date", "Clock in", "Clock out", "Worked", "Location", "Status"].map((h) => (
                      <th key={h} className="pb-2.5 text-[11px] font-medium text-ink-400 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const worked = calculateWorkedMinutes(r);
                    const isToday = r.date === todayISO();
                    return (
                      <tr key={r.id} className="border-b border-ink-50 last:border-0 hover:bg-ink-50/40">
                        <td className="py-3 pr-3 text-sm text-ink whitespace-nowrap">
                          {formatDisplayDate(r.date)}
                          {isToday && <span className="ml-1.5 text-[10px] text-brass-500 font-medium">Today</span>}
                        </td>
                        <td className="py-3 pr-3 text-sm font-mono tabular text-ink-500 whitespace-nowrap">{formatTime(r.clockIn)}</td>
                        <td className="py-3 pr-3 text-sm font-mono tabular text-ink-500 whitespace-nowrap">{formatTime(r.clockOut)}</td>
                        <td className="py-3 pr-3 text-sm font-mono tabular text-ink-500 whitespace-nowrap">{formatDuration(worked)}</td>
                        <td className="py-3 pr-3"><LocationBadge location={r.clockInLocation} /></td>
                        <td className="py-3 pr-3">
                          <div className="flex flex-wrap gap-1">
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

            {/* Mobile: touch-friendly cards, no horizontal scroll */}
            <div className="md:hidden space-y-3">
              {filtered.map((r) => {
                const worked = calculateWorkedMinutes(r);
                const isToday = r.date === todayISO();
                return (
                  <div key={r.id} className="rounded-card border border-ink-100 p-3.5">
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <p className="text-sm font-medium text-ink">
                        {formatDisplayDate(r.date)}
                        {isToday && <span className="ml-1.5 text-[10px] text-brass-500 font-medium">Today</span>}
                      </p>
                      <Badge status={r.status} />
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-2.5">
                      <div className="rounded-card bg-ink-50 px-2.5 py-2 text-center">
                        <p className="text-[10px] text-ink-400 mb-0.5">In</p>
                        <p className="text-xs font-mono tabular text-ink-600">{formatTime(r.clockIn)}</p>
                      </div>
                      <div className="rounded-card bg-ink-50 px-2.5 py-2 text-center">
                        <p className="text-[10px] text-ink-400 mb-0.5">Out</p>
                        <p className="text-xs font-mono tabular text-ink-600">{formatTime(r.clockOut)}</p>
                      </div>
                      <div className="rounded-card bg-ink-50 px-2.5 py-2 text-center">
                        <p className="text-[10px] text-ink-400 mb-0.5">Worked</p>
                        <p className="text-xs font-mono tabular text-ink-600">{formatDuration(worked)}</p>
                      </div>
                    </div>
                    {(r.loginStatus || r.logoutStatus) && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <LoginStatusBadge metrics={r} />
                        <LogoutStatusBadge metrics={r} />
                      </div>
                    )}
                    {r.clockInLocation && <LocationBadge location={r.clockInLocation} />}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
