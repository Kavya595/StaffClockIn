import { useEffect, useState } from "react";
import Modal from "../common/Modal";
import Input from "../common/Input";
import Select from "../common/Select";
import Button from "../common/Button";
import { STATUS_LABELS } from "../../constants/storageKeys";

function toTimeInput(isoTimestamp) {
  if (!isoTimestamp) return "";
  const d = new Date(isoTimestamp);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Lets an admin fix a staff member's clock-in / clock-out time or status for
// a given day. All derived fields (login/logout status, late/early minutes,
// working hours) are recalculated automatically by attendanceService, so the
// admin only ever edits the raw times.
export default function CorrectAttendanceModal({ open, onClose, staffMember, date, record, onSave }) {
  const [clockInTime, setClockInTime] = useState("");
  const [clockOutTime, setClockOutTime] = useState("");
  const [status, setStatus] = useState("present");

  useEffect(() => {
    if (open) {
      setClockInTime(toTimeInput(record?.clockIn));
      setClockOutTime(toTimeInput(record?.clockOut));
      setStatus(record?.status || "present");
    }
  }, [open, record]);

  function handleSave() {
    onSave({ clockInTime: clockInTime || null, clockOutTime: clockOutTime || null, status });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Correct attendance — ${staffMember?.name || ""}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="accent" onClick={handleSave}>Save correction</Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-ink-400">{date}</p>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Clock in" type="time" value={clockInTime} onChange={(e) => setClockInTime(e.target.value)} />
          <Input label="Clock out" type="time" value={clockOutTime} onChange={(e) => setClockOutTime(e.target.value)} />
        </div>
        <div>
          <span className="block text-xs font-medium text-ink-500 mb-1.5">Status</span>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </div>
        <p className="text-[11px] text-ink-300 leading-relaxed">
          Login/logout status, late/early minutes and working hours are recalculated automatically from the times above.
        </p>
      </div>
    </Modal>
  );
}
