import { useEffect, useMemo, useState, useRef, useId } from "react";
import { LogIn, LogOut, Check, MapPin, Loader2 } from "lucide-react";
import ConfettiBurst from "../common/ConfettiBurst";
import { useFeedback } from "../../hooks/useFeedback";
import { isClockOutAllowedNow } from "../../utils/dateUtils";

const DEFAULT_TARGET_MINUTES = 8 * 60;

function pad(n) {
  return String(n).padStart(2, "0");
}

function elapsedParts(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return { h, m, s };
}

/**
 * The hero clock-in / clock-out control.
 *
 * `size`: "lg" (Attendance page hero) or "md" (compact — dashboard card).
 * `phase` is derived from the record, plus a transient "success" beat that
 * plays a checkmark + confetti burst right after a punch resolves.
 */
export default function PunchClock({
  record,
  onClockIn,
  onClockOut,
  locating = false,
  size = "lg",
  locationLabel,
  requiredMinutes = DEFAULT_TARGET_MINUTES,
}) {
  const { celebrate } = useFeedback();
  const uid = useId().replace(/:/g, "");
  const [now, setNow] = useState(() => Date.now());
  const [pressing, setPressing] = useState(false);
  const [ripples, setRipples] = useState([]);
  const [successGlyph, setSuccessGlyph] = useState(null); // "in" | "out" | null
  const [burst, setBurst] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const rippleId = useRef(0);
  const successTimer = useRef(null);

  const clockedIn = !!record?.clockIn;
  const clockedOut = !!record?.clockOut;

  // Live ticking clock while a shift is open.
  useEffect(() => {
    if (!clockedIn || clockedOut) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [clockedIn, clockedOut]);

  useEffect(() => () => clearTimeout(successTimer.current), []);

  const elapsedMs = useMemo(() => {
    if (!record?.clockIn) return 0;
    const end = record.clockOut ? new Date(record.clockOut).getTime() : now;
    return Math.max(0, end - new Date(record.clockIn).getTime());
  }, [record?.clockIn, record?.clockOut, now]);

  const canClockOut = useMemo(() => isClockOutAllowedNow(new Date(now)), [now]);
  const clockOutLocked = clockedIn && !clockedOut && !canClockOut;

  const { h, m, s } = elapsedParts(elapsedMs);
  const progress = Math.min(1, elapsedMs / 60000 / (requiredMinutes || DEFAULT_TARGET_MINUTES));

  const dims = size === "lg" ? 232 : 168;
  const stroke = size === "lg" ? 10 : 8;
  const r = dims / 2 - stroke * 2;
  const circumference = 2 * Math.PI * r;
  const dashoffset = circumference * (1 - (clockedIn ? Math.max(progress, 0.02) : 0));

  const label = clockedOut ? "Day complete" : clockedIn ? "On duty" : successGlyph ? "" : "Tap to clock in";

  function spawnRipple() {
    const id = ++rippleId.current;
    setRipples((r) => [...r, id]);
    setTimeout(() => setRipples((r) => r.filter((x) => x !== id)), 900);
  }

  async function handlePress() {
    if (submitting || locating || clockOutLocked) return;
    spawnRipple();
    setPressing(true);
    setTimeout(() => setPressing(false), 220);

    const isClockingIn = !clockedIn;
    setSubmitting(true);
    try {
      if (isClockingIn) await onClockIn?.();
      else await onClockOut?.();
      const variant = isClockingIn ? "in" : "out";
      setSuccessGlyph(variant);
      setBurst((b) => b + 1);
      celebrate(variant);
      successTimer.current = setTimeout(() => setSuccessGlyph(null), 1500);
    } finally {
      setSubmitting(false);
    }
  }

  const busy = submitting || locating;
  const showSuccess = !!successGlyph;
  const finished = clockedIn && clockedOut;

  // Visual theme per state — orange "flame" for the call-to-action idle
  // state (ties back to the Qwik brand mark), amber/live gradient while a
  // shift is open, emerald once the day is wrapped up.
  const ringGradientId = finished ? `ringDone-${uid}` : clockedIn ? `ringLive-${uid}` : `ringIdle-${uid}`;
  const buttonBg = finished
    ? "bg-gradient-to-br from-moss to-emerald-600"
    : clockedIn
    ? "bg-gradient-ink"
    : "bg-gradient-flame";
  const buttonShadow = finished ? "shadow-glow" : clockedIn ? "shadow-lift" : "shadow-flame";

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div
        className="relative shrink-0"
        style={{ width: dims, height: dims }}
        role="button"
        tabIndex={finished ? -1 : 0}
        aria-label={
          clockedIn
            ? finished
              ? "Attendance complete"
              : clockOutLocked
              ? "Clock out available after 6:00 PM"
              : "Clock out"
            : "Clock in"
        }
        onKeyDown={(e) => {
          if (!finished && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            handlePress();
          }
        }}
      >
        {/* Breathing halo behind the idle button — draws the eye */}
        {!clockedIn && !showSuccess && (
          <span className="absolute inset-2 rounded-full bg-flame-400 blur-xl animate-breathe" />
        )}
        {clockedIn && !finished && (
          <span className="absolute inset-1 rounded-full bg-brass-400/40 blur-2xl animate-pulse" />
        )}

        {/* Progress ring */}
        <svg width={dims} height={dims} className="absolute inset-0 -rotate-90 pointer-events-none">
          <defs>
            <linearGradient id={`ringIdle-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFC48F" />
              <stop offset="100%" stopColor="#FD6C00" />
            </linearGradient>
            <linearGradient id={`ringLive-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FD6C00" />
              <stop offset="55%" stopColor="#5451B9" />
              <stop offset="100%" stopColor="#2E90E2" />
            </linearGradient>
            <linearGradient id={`ringDone-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#5FE3B3" />
              <stop offset="100%" stopColor="#13A870" />
            </linearGradient>
          </defs>
          <circle cx={dims / 2} cy={dims / 2} r={r} strokeWidth={stroke} stroke="rgba(255,255,255,0.12)" fill="none" />
          <circle
            cx={dims / 2}
            cy={dims / 2}
            r={r}
            strokeWidth={stroke}
            fill="none"
            stroke={`url(#${ringGradientId})`}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={clockedIn ? dashoffset : circumference}
            style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(.2,.8,.3,1)" }}
          />
        </svg>

        {/* Ripples on tap */}
        {ripples.map((id) => (
          <span
            key={id}
            className="absolute inset-3 rounded-full border-2 border-flame-400 animate-punch-ripple pointer-events-none"
          />
        ))}

        {/* Confetti */}
        {showSuccess && <ConfettiBurst seed={burst} count={size === "lg" ? 30 : 20} />}

        {/* Extra celebratory shockwave rings + colour flash on a successful clock-in */}
        {showSuccess && successGlyph === "in" && (
          <>
            <span className="absolute inset-3 rounded-full bg-flame-400/40 pointer-events-none animate-flash-glow" />
            <span
              key={`sw1-${burst}`}
              className="absolute inset-3 rounded-full border-4 border-flame-400 pointer-events-none animate-shockwave"
            />
            <span
              key={`sw2-${burst}`}
              className="absolute inset-3 rounded-full border-4 border-brass-300 pointer-events-none animate-shockwave"
              style={{ animationDelay: "0.15s" }}
            />
            <span
              key={`sw3-${burst}`}
              className="absolute inset-3 rounded-full border-4 border-sky pointer-events-none animate-shockwave"
              style={{ animationDelay: "0.3s" }}
            />
          </>
        )}

        {/* The button itself */}
        <button
          type="button"
          onClick={handlePress}
          disabled={finished || busy || clockOutLocked}
          title={clockOutLocked ? "Clock out available after 6:00 PM" : undefined}
          className={`absolute rounded-full overflow-hidden flex flex-col items-center justify-center gap-1 text-white transition-transform duration-150 ${buttonBg} ${buttonShadow} ${
            finished || clockOutLocked ? "cursor-default" : "cursor-pointer active:scale-[0.94]"
          } ${clockOutLocked ? "opacity-60" : ""} ${pressing ? "scale-[0.94]" : "scale-100"} ${
            !finished && !clockedIn ? "shine-sweep" : ""
          }`}
          style={{ inset: stroke * 2.4 }}
        >
          {busy ? (
            <Loader2 size={size === "lg" ? 30 : 22} className="animate-spin" />
          ) : showSuccess ? (
            <span className="animate-success-bounce flex flex-col items-center gap-1">
              <span
                className={`rounded-full bg-white/25 flex items-center justify-center shadow-glow ${
                  size === "lg" ? "w-12 h-12" : "w-9 h-9"
                }`}
              >
                <Check size={size === "lg" ? 26 : 18} strokeWidth={3} />
              </span>
              <span
                className={`font-display font-bold tracking-wide ${
                  successGlyph === "in" ? "text-amber-100" : "text-emerald-100"
                } ${size === "lg" ? "text-sm" : "text-[11px]"}`}
              >
                {successGlyph === "in" ? "Clocked in! 🎉" : "Clocked out!"}
              </span>
            </span>
          ) : finished ? (
            <>
              <Check size={size === "lg" ? 30 : 22} strokeWidth={3} />
              <span className={`font-display font-semibold ${size === "lg" ? "text-sm" : "text-[11px]"}`}>
                Complete
              </span>
            </>
          ) : clockedIn ? (
            <>
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-flame-300 font-semibold mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-flame-400 pulse-dot" /> Live
              </span>
              <span
                className={`font-mono font-semibold tabular ${size === "lg" ? "text-2xl" : "text-base"}`}
              >
                {h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`}
              </span>
              <span className={`font-medium opacity-90 ${size === "lg" ? "text-xs" : "text-[10px]"}`}>
                {clockOutLocked ? "Available at 6:00 PM" : "Tap to clock out"}
              </span>
            </>
          ) : (
            <>
              <LogIn size={size === "lg" ? 28 : 20} />
              <span className={`font-display font-semibold ${size === "lg" ? "text-sm" : "text-xs"}`}>
                Clock in
              </span>
            </>
          )}
        </button>
      </div>

      <p className={`font-display font-semibold text-paper ${size === "lg" ? "text-sm" : "text-xs"}`}>{label}</p>
      {locationLabel && (
        <p className="text-[11px] text-ink-300 flex items-center gap-1 max-w-[220px] text-center leading-snug">
          <MapPin size={11} className="text-sky shrink-0" /> {locationLabel}
        </p>
      )}
    </div>
  );
}
