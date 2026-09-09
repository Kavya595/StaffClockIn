import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { AlertTriangle, CheckCircle2, Download } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAttendance } from "../../hooks/useAttendance";
import { useSettings } from "../../hooks/useSettings";
import { useMyStaff } from "../../hooks/useMyStaff";
import { useToast } from "../../hooks/useToast";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import EmptyState from "../../components/common/EmptyState";
import { lastNDays, todayISO } from "../../utils/dateUtils";
import { summarize, trendByDay, calculateShortage } from "../../utils/calculations";
import { exportUserAttendanceExcel } from "../../services/excelService";

export default function StaffReports() {
  const { user } = useAuth();
  const { records } = useAttendance();
  const { settings } = useSettings();
  const { staff: myStaff } = useMyStaff();
  const toast = useToast();

  // A staff member can only ever export their own attendance — everything
  // here is scoped to `user.id`, the signed-in staff account, never a
  // staffId supplied by the caller. There is no admin-only bulk-export path
  // reachable from this page.
  const myRecords = useMemo(() => records.filter((r) => r.staffId === user.id), [records, user.id]);

  function handleDownloadExcel() {
    if (myRecords.length === 0) {
      toast.error("No attendance data to export yet.");
      return;
    }
    exportUserAttendanceExcel({
      staffMember: myStaff || { name: user.name, id: user.id },
      records: myRecords,
      settings,
      periodLabel: `All Time (as of ${todayISO()})`,
    });
    toast.success("Your attendance Excel report downloaded.");
  }

  const days = useMemo(() => lastNDays(30), []);
  const trend = useMemo(() => trendByDay(myRecords, days), [myRecords, days]);
  const chartData = trend.map((t) => ({ date: t.date.slice(5), Present: t.present }));

  const summary = summarize(myRecords);
  const shortage = calculateShortage(myRecords, settings.requiredAttendancePercentage);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">My reports</h1>
          <p className="text-sm text-ink-400">Your overall attendance summary</p>
        </div>
        <Button variant="outline" icon={Download} onClick={handleDownloadExcel}>Download My Attendance Excel</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Total marked days", value: summary.total },
          { label: "Present", value: summary.present, color: "text-moss" },
          { label: "On leave", value: summary.leave, color: "text-violet-600" },
          { label: "Attendance %", value: `${summary.percentage.toFixed(0)}%` },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-ink-400 mb-1.5">{s.label}</p>
            <p className={`font-display text-xl font-semibold tabular ${s.color || "text-ink"}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      <Card
        className={`p-4 flex items-start gap-3 ${
          shortage.short ? "border-rust/40 bg-rust-light/40" : "border-moss/30 bg-moss-light/40"
        }`}
      >
        {shortage.short ? (
          <>
            <AlertTriangle size={18} className="text-rust shrink-0 mt-0.5" />
            <p className="text-sm text-ink-600 leading-relaxed">
              You're at {shortage.currentPct.toFixed(0)}%, below the required {settings.requiredAttendancePercentage}%.
              You'd need about {shortage.daysNeeded} more present day{shortage.daysNeeded === 1 ? "" : "s"} in a row to
              reach the requirement.
            </p>
          </>
        ) : (
          <>
            <CheckCircle2 size={18} className="text-moss shrink-0 mt-0.5" />
            <p className="text-sm text-ink-600 leading-relaxed">
              You're at {shortage.currentPct.toFixed(0)}%, meeting the required {settings.requiredAttendancePercentage}%
              attendance threshold.
            </p>
          </>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-display font-semibold text-sm text-ink mb-4">Attendance — last 30 days</h2>
        {myRecords.length === 0 ? (
          <EmptyState title="No attendance data yet" message="Mark attendance to see your trend here." />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ left: -20, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="myPresentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16A34A" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#16A34A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EAEBF3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#7B7FA0" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#7B7FA0" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #EAEBF3", fontSize: 12, fontFamily: "Inter" }} />
                <Area type="monotone" dataKey="Present" stroke="#16A34A" fill="url(#myPresentGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}
