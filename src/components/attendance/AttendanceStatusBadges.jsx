import { formatDiffDuration, formatDuration } from "../../utils/dateUtils";

// Small colored pill in the same visual language as the existing Badge
// component, reused everywhere a login/logout status needs to be shown
// (staff dashboard, mark-attendance, admin table/cards).
function Pill({ tone, children }) {
  const tones = {
    good: "bg-moss-light text-moss",
    info: "bg-sky-light text-sky",
    warn: "bg-honey-light text-honey",
    bad: "bg-rust-light text-rust",
    neutral: "bg-ink-100 text-ink-600",
  };
  const dots = { good: "bg-moss", info: "bg-sky", warn: "bg-honey", bad: "bg-rust", neutral: "bg-ink-300" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[tone]}`} />
      {children}
    </span>
  );
}

export function LoginStatusBadge({ metrics }) {
  if (!metrics?.loginStatus) return null;
  if (metrics.loginStatus === "late") {
    return <Pill tone="bad">Late by {metrics.lateMinutes}m</Pill>;
  }
  if (metrics.loginStatus === "grace") {
    return <Pill tone="warn">Grace period</Pill>;
  }
  return <Pill tone="good">On time</Pill>;
}

export function LogoutStatusBadge({ metrics }) {
  if (!metrics?.logoutStatus) return null;
  if (metrics.logoutStatus === "early") return <Pill tone="warn">Early logout · {metrics.earlyMinutes}m</Pill>;
  if (metrics.logoutStatus === "expired") return <Pill tone="bad">Logout expired</Pill>;
  return <Pill tone="good">Normal logout</Pill>;
}

// Highly-visible one-line working status, e.g. for the dashboard hero.
const WORKING_STATUS_META = {
  not_started: { label: "Not Started", tone: "neutral" },
  working: { label: "Currently Working", tone: "info" },
  completed: { label: "Required Hours Completed", tone: "good" },
  logged_out: { label: "Logged Out", tone: "neutral" },
  incomplete: { label: "Attendance Incomplete", tone: "warn" },
};

export function WorkingStatusBadge({ status }) {
  const meta = WORKING_STATUS_META[status];
  if (!meta) return null;
  return <Pill tone={meta.tone}>● {meta.label}</Pill>;
}

// Compact "worked vs required" line, e.g. "8h 42m worked · +0h 12m".
export function WorkingHoursSummary({ metrics, className = "" }) {
  if (!metrics) return null;
  return (
    <p className={`text-xs text-ink-400 ${className}`}>
      {formatDuration(metrics.workedMinutes)} worked
      {metrics.requiredMinutes != null && ` of ${formatDuration(metrics.requiredMinutes)} required`}
      {metrics.workingHoursDiff != null && (
        <span className={metrics.workingHoursDiff < 0 ? "text-rust" : "text-moss"}> · {formatDiffDuration(metrics.workingHoursDiff)}</span>
      )}
    </p>
  );
}
