import { useState } from "react";
import { LogIn, LogOut, Pencil } from "lucide-react";
import Button from "../common/Button";
import StatusMenu from "./StatusMenu";
import { LocationBadge } from "../common/LocationBadge";
import { formatTime, formatDuration } from "../../utils/dateUtils";
import { calculateWorkedMinutes } from "../../utils/calculations";
import { LoginStatusBadge, LogoutStatusBadge } from "./AttendanceStatusBadges";

export default function AttendanceRow({ staffMember, record, onClockIn, onClockOut, onStatusChange, onCorrect, isToday }) {
  const [punching, setPunching] = useState(false);
  const worked = record ? calculateWorkedMinutes(record) : null;

  function punch(fn) {
    setPunching(true);
    fn();
    setTimeout(() => setPunching(false), 450);
  }

  return (
    <tr className="border-b border-ink-50 last:border-0 hover:bg-ink-50/40">
      <td className="py-3 pr-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-display font-semibold text-white shrink-0"
            style={{ backgroundColor: staffMember.avatarColor || "#120D9E" }}
          >
            {staffMember.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink truncate">{staffMember.name}</p>
            <p className="text-[11px] text-ink-400 truncate">{staffMember.department}</p>
          </div>
        </div>
      </td>
      <td className="py-3 pr-3 text-sm font-mono tabular text-ink-500 whitespace-nowrap">{formatTime(record?.clockIn)}</td>
      <td className="py-3 pr-3 text-sm font-mono tabular text-ink-500 whitespace-nowrap">{formatTime(record?.clockOut)}</td>
      <td className="py-3 pr-3 text-sm font-mono tabular text-ink-500 whitespace-nowrap">{formatDuration(worked)}</td>
      <td className="py-3 pr-3"><LocationBadge location={record?.clockInLocation} /></td>
      <td className="py-3 pr-3"><LocationBadge location={record?.clockOutLocation} /></td>
      <td className="py-3 pr-3">
        <div className="flex flex-col gap-1.5 items-start">
          <StatusMenu value={record?.status} onChange={(status) => onStatusChange(staffMember.id, status)} />
          <div className="flex flex-wrap gap-1">
            <LoginStatusBadge metrics={record} />
            <LogoutStatusBadge metrics={record} />
          </div>
        </div>
        {record?.markedBy?.role === "staff" && (
          <p className="text-[10px] text-ink-300 mt-1">Self-marked</p>
        )}
      </td>
      <td className="py-3 pl-1">
        <div className="flex items-center gap-1.5 justify-end">
          {!record?.clockIn ? (
            <Button
              size="sm"
              variant="accent"
              icon={LogIn}
              className={punching ? "animate-punch" : ""}
              onClick={() => punch(() => onClockIn(staffMember.id))}
              disabled={!isToday}
              title={!isToday ? "Clock in only available for today" : "Clock in"}
            >
              In
            </Button>
          ) : !record?.clockOut ? (
            <Button
              size="sm"
              variant="outline"
              icon={LogOut}
              className={punching ? "animate-punch" : ""}
              onClick={() => punch(() => onClockOut(staffMember.id))}
              disabled={!isToday}
              title={!isToday ? "Clock out only available for today" : "Clock out"}
            >
              Out
            </Button>
          ) : (
            <span className="text-[11px] text-moss font-medium px-2">Complete</span>
          )}
          {onCorrect && (
            <button
              type="button"
              onClick={() => onCorrect(staffMember)}
              title="Correct attendance"
              className="p-1.5 rounded-full text-ink-400 hover:text-ink hover:bg-ink-50"
            >
              <Pencil size={14} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
