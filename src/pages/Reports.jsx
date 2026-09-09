import { useMemo, useState } from "react";
import { Download, FileBarChart } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import Card from "../components/common/Card";
import Select from "../components/common/Select";
import Badge from "../components/common/Badge";
import Button from "../components/common/Button";
import EmptyState from "../components/common/EmptyState";
import { useAttendance } from "../hooks/useAttendance";
import { useStaff } from "../hooks/useStaff";
import { useDepartments } from "../hooks/useDepartments";
import { useSettings } from "../hooks/useSettings";
import { filterRecords, summarize, groupByStaff } from "../utils/calculations";
import { exportRecordsAsCSV } from "../services/backupService";
import { exportAttendanceExcel } from "../services/excelService";
import { lastNDays, todayISO, formatDisplayDate } from "../utils/dateUtils";
import { useToast } from "../hooks/useToast";

export default function Reports() {
  const { records } = useAttendance();
  const { staff } = useStaff();
  const { departments } = useDepartments();
  const { settings } = useSettings();
  const toast = useToast();

  const [staffId, setStaffId] = useState("");
  const [department, setDepartment] = useState("");
  const [from, setFrom] = useState(lastNDays(30)[0]);
  const [to, setTo] = useState(todayISO());

  const staffById = useMemo(() => Object.fromEntries(staff.map((s) => [s.id, s])), [staff]);

  const filtered = useMemo(
    () => filterRecords(records, { staffId, department, staffById, from, to }),
    [records, staffId, department, staffById, from, to]
  );

  const summary = summarize(filtered);

  const byStaff = useMemo(() => {
    const grouped = groupByStaff(filtered);
    return Object.entries(grouped)
      .map(([id, recs]) => ({ staff: staffById[id], ...summarize(recs) }))
      .filter((r) => r.staff)
      .sort((a, b) => b.percentage - a.percentage);
  }, [filtered, staffById]);

  const chartData = byStaff.slice(0, 10).map((r) => ({
    name: r.staff.name.split(" ")[0],
    Present: r.present,
    Leave: r.leave,
  }));

  function handleExportCSV() {
    if (byStaff.length === 0) {
      toast.error("No data to export for this filter.");
      return;
    }
    exportRecordsAsCSV(
      byStaff.map((r) => ({
        name: r.staff.name,
        department: r.staff.department,
        present: r.present,
        leave: r.leave,
        late: r.late,
        total: r.total,
        percentage: r.percentage.toFixed(1),
      })),
      [
        { key: "name", label: "Name" },
        { key: "department", label: "Department" },
        { key: "present", label: "Present" },
        { key: "leave", label: "Leave" },
        { key: "late", label: "Late" },
        { key: "total", label: "Total Marked" },
        { key: "percentage", label: "Attendance %" },
      ],
      `attendance-report-${from}-to-${to}.csv`
    );
    toast.success("CSV exported.");
  }

  function handleExportExcel() {
    if (filtered.length === 0) {
      toast.error("No data to export for this filter.");
      return;
    }
    exportAttendanceExcel(filtered, staffById, settings, `attendance-detailed-${from}-to-${to}.xlsx`);
    toast.success("Excel exported.");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">Reports</h1>
          <p className="text-sm text-ink-400">{formatDisplayDate(from)} — {formatDisplayDate(to)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" icon={Download} onClick={handleExportCSV}>Export CSV</Button>
          <Button variant="accent" icon={Download} onClick={handleExportExcel}>Export Excel</Button>
        </div>
      </div>

      <Card className="p-4 sm:p-5">
        <div className="grid sm:grid-cols-4 gap-3">
          <label className="block">
            <span className="block text-xs font-medium text-ink-500 mb-1.5">From</span>
            <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-card border border-ink-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass/40 focus:border-brass" />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-ink-500 mb-1.5">To</span>
            <input type="date" value={to} min={from} max={todayISO()} onChange={(e) => setTo(e.target.value)} className="w-full rounded-card border border-ink-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass/40 focus:border-brass" />
          </label>
          <Select label="Staff" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
            <option value="">All staff</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
          <Select label="Department" value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </Select>
        </div>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total records", value: summary.total },
          { label: "Present", value: summary.present, color: "text-moss" },
          { label: "Late", value: summary.late, color: "text-rust" },
          { label: "Leave", value: summary.leave, color: "text-violet-600" },
          { label: "Attendance %", value: `${summary.percentage.toFixed(1)}%` },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-ink-400 mb-1">{s.label}</p>
            <p className={`font-display text-lg font-semibold tabular ${s.color || "text-ink"}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h2 className="font-display font-semibold text-sm text-ink mb-4">Attendance by staff (top 10)</h2>
        {chartData.length === 0 ? (
          <EmptyState icon={FileBarChart} title="No data for this range" message="Adjust the filters to see results." />
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ left: -20, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EAEBF3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#7B7FA0" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#7B7FA0" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #EAEBF3", fontSize: 12, fontFamily: "Inter" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Present" stackId="a" fill="#16A34A" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Leave" stackId="a" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-4 sm:p-5">
        <h2 className="font-display font-semibold text-sm text-ink mb-4">Detail by staff</h2>
        {byStaff.length === 0 ? (
          <EmptyState icon={FileBarChart} title="Nothing to show" message="No attendance matches the current filters." />
        ) : (
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full min-w-[560px] text-left">
              <thead>
                <tr className="border-b border-ink-100">
                  {["Staff", "Department", "Present", "Leave", "Total", "Attendance"].map((h) => (
                    <th key={h} className="pb-2.5 text-[11px] font-medium text-ink-400 uppercase tracking-wide pr-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {byStaff.map((r) => (
                  <tr key={r.staff.id} className="border-b border-ink-50 last:border-0">
                    <td className="py-2.5 pr-3 text-sm font-medium text-ink whitespace-nowrap">{r.staff.name}</td>
                    <td className="py-2.5 pr-3"><Badge>{r.staff.department}</Badge></td>
                    <td className="py-2.5 pr-3 text-sm tabular text-moss">{r.present}</td>
                    <td className="py-2.5 pr-3 text-sm tabular text-violet-600">{r.leave}</td>
                    <td className="py-2.5 pr-3 text-sm tabular text-ink-500">{r.total}</td>
                    <td className="py-2.5 pr-3 text-sm font-semibold tabular text-ink">{r.percentage.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
