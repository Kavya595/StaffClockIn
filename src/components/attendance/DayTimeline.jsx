import { useEffect, useState } from "react";
import { LogIn, LogOut, Flag } from "lucide-react";

const DAY_START_HOUR = 6; // 6:00am
const DAY_END_HOUR = 22; // 10:00pm
const WINDOW_MIN = (DAY_END_HOUR - DAY_START_HOUR) * 60;

function minutesIntoWindow(date) {
  const mins = date.getHours() * 60 + date.getMinutes() - DAY_START_HOUR * 60;
  return Math.min(WINDOW_MIN, Math.max(0, mins));
}

function pct(date) {
  return (minutesIntoWindow(date) / WINDOW_MIN) * 100;
}

function fmt(date) {
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/**
 * A quiet, always-visible "shape of the day": where you clocked in, where you
 * are right now, when an 8-hour shift would wrap up, and where you actually
 * clocked out. Purely informational, updates live while a shift is open.
 */
export default function DayTimeline({ record, requiredMinutes = 8 * 60 }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!record?.clockIn || record?.clockOut) return undefined;
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, [record?.clockIn, record?.clockOut]);

  if (!record?.clockIn) {
    return (
      <div className="text-center py-2">
        <p className="text-xs text-ink-300">Your day's timeline will appear here once you clock in.</p>
      </div>
    );
  }

  const inDate = new Date(record.clockIn);
  const outDate = record.clockOut ? new Date(record.clockOut) : null;
  const expectedOut = new Date(inDate.getTime() + requiredMinutes * 60000);

  const inPct = pct(inDate);
  const nowPct = pct(now);
  const expectedPct = pct(expectedOut);
  const outPct = outDate ? pct(outDate) : null;
  const fillEndPct = outPct ?? nowPct;

  return (
    <div className="pt-1 pb-2">
      <div className="relative h-1.5 rounded-full bg-white/10 mx-2">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-live opacity-90"
          style={{ width: `${Math.max(0, fillEndPct - inPct)}%`, left: `${inPct}%` }}
        />
        {/* Expected clock-out flag */}
        <div className="absolute -top-2.5" style={{ left: `${expectedPct}%`, transform: "translateX(-50%)" }}>
          <Flag size={11} className="text-ink-300" />
        </div>
        {/* Clock-in marker */}
        <div
          className="absolute top-1/2 w-3 h-3 rounded-full bg-flame-500 ring-2 ring-ink-900 shadow-card"
          style={{ left: `${inPct}%`, transform: "translate(-50%, -50%)" }}
        />
        {/* Live "now" marker */}
        {!outDate && (
          <div
            className="absolute top-1/2 w-3 h-3 rounded-full bg-white ring-2 ring-brass-400 timeline-now"
            style={{ left: `${nowPct}%`, transform: "translate(-50%, -50%)" }}
          />
        )}
        {/* Clock-out marker */}
        {outDate && (
          <div
            className="absolute top-1/2 w-3 h-3 rounded-full bg-moss ring-2 ring-ink-900 shadow-card"
            style={{ left: `${outPct}%`, transform: "translate(-50%, -50%)" }}
          />
        )}
      </div>

      <div className="flex justify-between mt-2.5 px-2 text-[10px] text-ink-300">
        <span className="inline-flex items-center gap-1">
          <LogIn size={10} className="text-flame-400" /> {fmt(inDate)}
        </span>
        <span className="inline-flex items-center gap-1 text-ink-300">
          <Flag size={10} /> Target {fmt(expectedOut)}
        </span>
        <span className="inline-flex items-center gap-1">
          <LogOut size={10} className="text-moss" /> {outDate ? fmt(outDate) : "In progress"}
        </span>
      </div>
    </div>
  );
}
