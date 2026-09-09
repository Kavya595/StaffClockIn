import { formatDuration } from "../../utils/dateUtils";

/**
 * Circular "today's working progress" indicator — worked vs required hours,
 * plus a remaining/extra caption underneath. Purely presentational; all the
 * numbers come from computeAttendanceMetrics() so the math stays centralized.
 */
export default function WorkingHoursRing({ metrics, size = 132, stroke = 10 }) {
  const progress = metrics?.workingProgress ?? 0;
  const r = size / 2 - stroke * 1.5;
  const circumference = 2 * Math.PI * r;
  const dashoffset = circumference * (1 - progress / 100);
  const completed = metrics?.workingStatus === "completed" || metrics?.workingStatus === "logged_out";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} stroke="rgba(0,0,0,0.06)" fill="none" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            strokeWidth={stroke}
            fill="none"
            stroke={completed ? "#13A870" : "#FD6C00"}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashoffset}
            style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(.2,.8,.3,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-xl font-semibold text-ink tabular">{progress}%</span>
          <span className="text-[11px] text-ink-400 tabular mt-0.5">
            {formatDuration(metrics?.liveWorkedMinutes)} / {formatDuration(metrics?.requiredMinutes)}
          </span>
        </div>
      </div>
      {metrics?.workedMinutes == null && metrics?.liveWorkedMinutes == null ? (
        <p className="text-xs text-ink-400">Not clocked in yet</p>
      ) : completed ? (
        <p className="text-xs font-medium text-moss">
          ✓ Required hours completed{metrics.extraMinutes > 0 ? ` · +${formatDuration(metrics.extraMinutes)} extra` : ""}
        </p>
      ) : (
        <p className="text-xs text-ink-400">{formatDuration(metrics.remainingMinutes)} remaining</p>
      )}
    </div>
  );
}
