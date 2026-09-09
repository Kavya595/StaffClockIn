import { useMemo, useState } from "react";
import { MapPin, AlertTriangle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAttendance } from "../../hooks/useAttendance";
import { useSettings } from "../../hooks/useSettings";
import Card from "../../components/common/Card";
import StatusMenu from "../../components/attendance/StatusMenu";
import PunchClock from "../../components/attendance/PunchClock";
import DayTimeline from "../../components/attendance/DayTimeline";
import { LoginStatusBadge, LogoutStatusBadge } from "../../components/attendance/AttendanceStatusBadges";
import { LocationCard } from "../../components/common/LocationBadge";
import { todayISO, formatDisplayDate, formatTime, formatDuration, formatDiffDuration, isClockOutAllowedNow } from "../../utils/dateUtils";
import { calculateWorkedMinutes, computeAttendanceMetrics, getRequiredMinutes } from "../../utils/calculations";
import { captureLocation, isGeoSupported } from "../../utils/geo";
import { useToast } from "../../hooks/useToast";

export default function StaffAttendance() {
  const { user } = useAuth();
  const { records, clockIn, clockOut, markStatus } = useAttendance();
  const { settings } = useSettings();
  const toast = useToast();
  const [locating, setLocating] = useState(false);
  const today = todayISO();

  const todayRecord = useMemo(
    () => records.find((r) => r.staffId === user.id && r.date === today) || null,
    [records, user.id, today]
  );

  const worked = todayRecord ? calculateWorkedMinutes(todayRecord) : null;
  const metrics = useMemo(() => computeAttendanceMetrics(todayRecord, settings), [todayRecord, settings]);

  async function withLocation(action, successMessage) {
    if (!isGeoSupported()) {
      try {
        await action(null);
        toast.info(`${successMessage} (location not supported on this device).`);
      } catch (err) {
        toast.error(err.message || "That didn't go through.");
      }
      return;
    }
    setLocating(true);
    let location = null;
    try {
      location = await captureLocation();
    } catch {
      // permission denied / unavailable — fall through and attempt with no location
    }
    try {
      await action(location);
      toast.success(
        location?.address
          ? `${successMessage} at ${location.address.split(",").slice(0, 2).join(", ")}.`
          : `${successMessage}${location ? " — location captured." : " (location unavailable)."}`
      );
    } catch (err) {
      toast.error(err.message || "That didn't go through.");
    } finally {
      setLocating(false);
    }
  }

  async function handleClockIn() {
    await withLocation((location) => clockIn(user.id, today, location), "Clocked in");
  }
  async function handleClockOut() {
    if (!isClockOutAllowedNow()) {
      toast.error("Clock out is only available after 6:00 PM.");
      return;
    }
    await withLocation((location) => clockOut(user.id, today, location), "Clocked out");
  }
  function handleStatus(status) {
    markStatus(user.id, today, status);
    toast.success("Attendance updated.");
  }

  const locationLabel = !todayRecord?.clockIn
    ? isGeoSupported()
      ? "We'll capture your GPS location the moment you tap in."
      : "Location capture isn't supported on this device."
    : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold text-ink">Mark attendance</h1>
        <p className="text-sm text-ink-400">{formatDisplayDate(today)}</p>
      </div>

      <Card className="p-6 sm:p-8 overflow-hidden relative bg-gradient-ink text-paper border-0 shadow-lift">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-flame-500/20 blur-3xl animate-blob pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-brass/25 blur-3xl animate-blob pointer-events-none" style={{ animationDelay: "3s" }} />

        <div className="relative flex flex-col items-center text-center gap-1 mb-5">
          <div className="w-12 h-12 rounded-full bg-gradient-accent text-white flex items-center justify-center font-display font-semibold text-base mb-2 shadow-glow-sm">
            {user.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
          </div>
          <p className="font-display font-semibold text-paper">{user.name}</p>
          <p className="text-xs text-ink-300">{user.staffId}</p>
        </div>

        <div className="relative flex justify-center mb-4">
          <PunchClock
            record={todayRecord}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
            locating={locating}
            size="lg"
            locationLabel={locationLabel}
            requiredMinutes={getRequiredMinutes(settings)}
          />
        </div>

        <div className="relative flex flex-wrap items-center justify-center gap-1.5 mb-2">
          <LoginStatusBadge metrics={metrics} />
          <LogoutStatusBadge metrics={metrics} />
        </div>
        {todayRecord?.clockIn && (
          <p className="relative text-center text-[11px] text-ink-300 mb-4">
            Official login: {settings.loginTime} · Your login: {formatTime(todayRecord.clockIn)}
          </p>
        )}

        <div className="relative grid grid-cols-3 gap-3 mb-2 max-w-sm mx-auto">
          <div className="text-center">
            <p className="text-[11px] text-ink-300 mb-1">Clock in</p>
            <p className="font-mono text-sm tabular text-paper">{formatTime(todayRecord?.clockIn)}</p>
          </div>
          <div className="text-center">
            <p className="text-[11px] text-ink-300 mb-1">Clock out</p>
            <p className="font-mono text-sm tabular text-paper">{formatTime(todayRecord?.clockOut)}</p>
          </div>
          <div className="text-center">
            <p className="text-[11px] text-ink-300 mb-1">Worked</p>
            <p className="font-mono text-sm tabular text-paper">{formatDuration(worked)}</p>
            {metrics.workingHoursDiff != null && (
              <p className={`text-[10px] mt-0.5 ${metrics.workingHoursDiff < 0 ? "text-flame-300" : "text-moss"}`}>
                {formatDiffDuration(metrics.workingHoursDiff)} vs {formatDuration(metrics.requiredMinutes)}
              </p>
            )}
          </div>
        </div>

        {todayRecord?.clockIn && (
          <div className="relative mt-4 pt-4 border-t border-white/10">
            <DayTimeline record={todayRecord} requiredMinutes={getRequiredMinutes(settings)} />
          </div>
        )}

        <div className="relative flex items-center justify-center gap-2 mt-5">
          <span className="text-xs text-ink-300">Status</span>
          <StatusMenu value={todayRecord?.status} onChange={handleStatus} />
        </div>
      </Card>

      {(todayRecord?.clockIn || todayRecord?.clockOut) && (
        <div className="grid sm:grid-cols-2 gap-3">
          <LocationCard label="Clock-in location" location={todayRecord?.clockInLocation} accentClass="text-moss bg-moss-light" />
          <LocationCard label="Clock-out location" location={todayRecord?.clockOutLocation} accentClass="text-sky bg-sky-light" />
        </div>
      )}

      {!isGeoSupported() && (
        <Card className="p-4 flex items-start gap-3 border-honey/40 bg-honey-light/40">
          <AlertTriangle size={16} className="text-honey shrink-0 mt-0.5" />
          <p className="text-xs text-ink-600 leading-relaxed">
            This device doesn't support location capture — attendance will still be recorded without a location tag.
          </p>
        </Card>
      )}

      <Card className="p-4 flex items-start gap-3">
        <MapPin size={16} className="text-sky shrink-0 mt-0.5" />
        <p className="text-xs text-ink-400 leading-relaxed">
          Clocking in or out captures your device's current GPS location so your administrator can verify where you
          checked in from. You can only mark attendance for today — to review past days, open{" "}
          <span className="font-medium text-ink-500">Attendance History</span>.
        </p>
      </Card>
    </div>
  );
}
