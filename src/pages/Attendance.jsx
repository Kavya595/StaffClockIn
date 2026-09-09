import { useMemo, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { useStaff } from "../hooks/useStaff";
import { useAttendance } from "../hooks/useAttendance";
import { useDepartments } from "../hooks/useDepartments";
import Card from "../components/common/Card";
import SearchInput from "../components/common/SearchInput";
import Select from "../components/common/Select";
import EmptyState from "../components/common/EmptyState";
import AttendanceRow from "../components/attendance/AttendanceRow";
import AttendanceCard from "../components/attendance/AttendanceCard";
import CorrectAttendanceModal from "../components/attendance/CorrectAttendanceModal";
import { todayISO, formatDisplayDate } from "../utils/dateUtils";
import { summarize } from "../utils/calculations";
import { useToast } from "../hooks/useToast";

export default function Attendance() {
  const { staff } = useStaff();
  const { departments } = useDepartments();
  const { records, clockIn, clockOut, markStatus, correctRecord } = useAttendance();
  const toast = useToast();

  const [date, setDate] = useState(todayISO());
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [correcting, setCorrecting] = useState(null); // staffMember being corrected

  const isToday = date === todayISO();

  const dayRecords = useMemo(() => records.filter((r) => r.date === date), [records, date]);
  const recordByStaff = useMemo(() => Object.fromEntries(dayRecords.map((r) => [r.staffId, r])), [dayRecords]);

  const filteredStaff = useMemo(() => {
    return staff.filter((s) => {
      if (department && s.department !== department) return false;
      if (search && !`${s.name} ${s.role}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [staff, department, search]);

  const summary = summarize(dayRecords);

  function handleClockIn(staffId) {
    clockIn(staffId, date);
    toast.success("Clocked in.");
  }
  function handleClockOut(staffId) {
    try {
      clockOut(staffId, date);
      toast.success("Clocked out.");
    } catch (err) {
      toast.error(err.message || "Clock out is not available right now.");
    }
  }
  function handleStatus(staffId, status) {
    markStatus(staffId, date, status);
    toast.success("Attendance updated.");
  }
  function handleSaveCorrection(updates) {
    correctRecord(correcting.id, date, updates);
    toast.success("Attendance corrected.");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">Attendance</h1>
          <p className="text-sm text-ink-400">{formatDisplayDate(date)}</p>
        </div>
        <input
          type="date"
          value={date}
          max={todayISO()}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-card border border-ink-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass/40 focus:border-brass"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Present", value: summary.present, color: "text-moss" },
          { label: "Late", value: summary.late, color: "text-honey" },
          { label: "On Leave", value: summary.leave, color: "text-brass-600" },
          { label: "Marked", value: `${summary.total}/${staff.length}`, color: "text-ink-600" },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-ink-400 mb-1">{s.label}</p>
            <p className={`font-display text-lg font-semibold tabular ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Search staff..." />
          <Select value={department} onChange={(e) => setDepartment(e.target.value)} className="sm:w-52">
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </Select>
        </div>

        {filteredStaff.length === 0 ? (
          <EmptyState icon={CalendarCheck} title="No staff found" message="Try a different search or filter." />
        ) : (
          <>
            {/* Wide screens: full data table */}
            <div className="hidden md:block overflow-x-auto scroll-thin -mx-1">
              <table className="w-full min-w-[640px] text-left">
                <thead>
                  <tr className="border-b border-ink-100">
                    {["Staff", "Clock in", "Clock out", "Worked", "Login location", "Logout location", "Status", ""].map((h, i) => (
                      <th key={i} className={`pb-2.5 text-[11px] font-medium text-ink-400 uppercase tracking-wide ${i === 6 ? "text-right" : ""}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map((s) => (
                    <AttendanceRow
                      key={s.id}
                      staffMember={s}
                      record={recordByStaff[s.id]}
                      onClockIn={handleClockIn}
                      onClockOut={handleClockOut}
                      onStatusChange={handleStatus}
                      onCorrect={setCorrecting}
                      isToday={isToday}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: touch-friendly cards, no horizontal scroll */}
            <div className="md:hidden space-y-3">
              {filteredStaff.map((s) => (
                <AttendanceCard
                  key={s.id}
                  staffMember={s}
                  record={recordByStaff[s.id]}
                  onClockIn={handleClockIn}
                  onClockOut={handleClockOut}
                  onStatusChange={handleStatus}
                  onCorrect={setCorrecting}
                  isToday={isToday}
                />
              ))}
            </div>
          </>
        )}
      </Card>

      <CorrectAttendanceModal
        open={!!correcting}
        onClose={() => setCorrecting(null)}
        staffMember={correcting}
        date={date}
        record={correcting ? recordByStaff[correcting.id] : null}
        onSave={handleSaveCorrection}
      />
    </div>
  );
}
