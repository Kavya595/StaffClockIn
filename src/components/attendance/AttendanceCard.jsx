import { useState } from "react";
import { LogIn, LogOut, Pencil } from "lucide-react";
import Card from "../common/Card";
import Button from "../common/Button";
import StatusMenu from "./StatusMenu";
import { LocationBadge } from "../common/LocationBadge";
import { formatTime, formatDuration } from "../../utils/dateUtils";
import { calculateWorkedMinutes } from "../../utils/calculations";
import { LoginStatusBadge, LogoutStatusBadge } from "./AttendanceStatusBadges";

// Touch-friendly stand-in for a table row on narrow screens — same data and
// actions as AttendanceRow, laid out as a card instead of a horizontally
// scrolling table.
export default function AttendanceCard({ staffMember, record, onClockIn, onClockOut, onStatusChange, onCorrect, isToday }) {
  const [punching, setPunching] = useState(false);
  const worked = record ? calculateWorkedMinutes(record) : null;

  function punch(fn) {
    setPunching(true);
    fn();
    setTimeout(() => setPunching(false), 450);
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-display font-semibold text-white shrink-0"
            style={{ backgroundColor: staffMember.avatarColor || "#120D9E" }}
          >
            {staffMember.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink truncate">{staffMember.name}</p>
            <p className="text-[11px] text-ink-400 truncate">{staffMember.department}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <StatusMenu value={record?.status} onChange={(status) => onStatusChange(staffMember.id, status)} />
          {onCorrect && (
            <button
              type="button"
              onClick={() => onCorrect(staffMember)}
              title="Correct attendance"
              className="p-1.5 rounded-full text-ink-400 hover:text-ink hover:bg-ink-50 active:bg-ink-100"
            >
              <Pencil size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-card bg-ink-50 px-2.5 py-2 text-center">
          <p className="text-[10px] text-ink-400 mb-0.5">In</p>
          <p className="text-xs font-mono tabular text-ink-600">{formatTime(record?.clockIn)}</p>
        </div>
        <div className="rounded-card bg-ink-50 px-2.5 py-2 text-center">
          <p className="text-[10px] text-ink-400 mb-0.5">Out</p>
          <p className="text-xs font-mono tabular text-ink-600">{formatTime(record?.clockOut)}</p>
        </div>
        <div className="rounded-card bg-ink-50 px-2.5 py-2 text-center">
          <p className="text-[10px] text-ink-400 mb-0.5">Worked</p>
          <p className="text-xs font-mono tabular text-ink-600">{formatDuration(worked)}</p>
        </div>
      </div>

      {(record?.loginStatus || record?.logoutStatus) && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          <LoginStatusBadge metrics={record} />
          <LogoutStatusBadge metrics={record} />
        </div>
      )}

      {(record?.clockInLocation || record?.clockOutLocation) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
          {record?.clockInLocation && (
            <div className="flex items-center gap-1 text-[10px] text-ink-400">
              In: <LocationBadge location={record.clockInLocation} />
            </div>
          )}
          {record?.clockOutLocation && (
            <div className="flex items-center gap-1 text-[10px] text-ink-400">
              Out: <LocationBadge location={record.clockOutLocation} />
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        {record?.markedBy?.role === "staff" ? (
          <p className="text-[10px] text-ink-300">Self-marked</p>
        ) : <span />}
        {!record?.clockIn ? (
          <Button
            size="sm"
            variant="accent"
            icon={LogIn}
            className={`w-full sm:w-auto ${punching ? "animate-punch" : ""}`}
            onClick={() => punch(() => onClockIn(staffMember.id))}
            disabled={!isToday}
            title={!isToday ? "Clock in only available for today" : "Clock in"}
          >
            Clock in
          </Button>
        ) : !record?.clockOut ? (
          <Button
            size="sm"
            variant="outline"
            icon={LogOut}
            className={`w-full sm:w-auto ${punching ? "animate-punch" : ""}`}
            onClick={() => punch(() => onClockOut(staffMember.id))}
            disabled={!isToday}
            title={!isToday ? "Clock out only available for today" : "Clock out"}
          >
            Clock out
          </Button>
        ) : (
          <span className="text-[11px] text-moss font-medium px-2">Complete</span>
        )}
      </div>
    </Card>
  );
}
