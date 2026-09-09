import { useMemo, useState, useCallback, useEffect } from "react";
import {
  Radio,
  History,
  ShieldAlert,
  Download,
  RefreshCw,
  MapPin,
  Monitor,
  Clock,
} from "lucide-react";
import Card from "../components/common/Card";
import Select from "../components/common/Select";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import EmptyState from "../components/common/EmptyState";
import Modal from "../components/common/Modal";
import { LocationBadge } from "../components/common/LocationBadge";
import { useStaff } from "../hooks/useStaff";
import { useDepartments } from "../hooks/useDepartments";
import { lastNDays, todayISO, formatDuration } from "../utils/dateUtils";
import * as sessionService from "../services/sessionService";
import { exportLoginActivityExcel } from "../services/excelService";
import { useToast } from "../hooks/useToast";

const TABS = [
  { id: "live", label: "Live status", icon: Radio },
  { id: "history", label: "History", icon: History },
  { id: "audit", label: "Audit log", icon: ShieldAlert },
];

function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function statusPill(row) {
  if (row.online) return <Badge className="bg-moss-light text-moss">🟢 Online</Badge>;
  if (!row.logoutAt) return <Badge className="bg-honey-light text-honey">🟡 No logout recorded</Badge>;
  return <Badge className="bg-ink-100 text-ink-500">🔵 Logged out</Badge>;
}

export default function LoginActivity() {
  const { staff } = useStaff();
  const { departments } = useDepartments();
  const toast = useToast();

  const [tab, setTab] = useState("live");
  const [userId, setUserId] = useState("");
  const [department, setDepartment] = useState("");
  const [from, setFrom] = useState(lastNDays(7)[0]);
  const [to, setTo] = useState(todayISO());
  const [timelineUser, setTimelineUser] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  // Pull the shared login-activity log down from the Sheets backend (when
  // configured) once on mount, same pattern as the collection hooks.
  useEffect(() => {
    let cancelled = false;
    sessionService.syncEvents().then(() => {
      if (!cancelled) refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const liveStatus = useMemo(() => sessionService.getLiveStatus(), [refreshTick]);

  const userOptions = useMemo(
    () => [
      { id: "admin", name: "Admin User" },
      ...staff.map((s) => ({ id: s.id, name: s.name })),
    ],
    [staff]
  );

  const sessionRows = useMemo(
    () =>
      sessionService.getSessionRows({
        userId: userId || null,
        department: department || null,
        dateFrom: from || null,
        dateTo: to || null,
      }),
    [userId, department, from, to, refreshTick]
  );

  const auditEvents = useMemo(
    () =>
      sessionService.filterEvents({
        userId: userId || null,
        department: department || null,
        dateFrom: from || null,
        dateTo: to || null,
      }),
    [userId, department, from, to, refreshTick]
  );

  const userTimeline = useMemo(
    () => (timelineUser ? sessionService.getEventsForUser(timelineUser.userId) : []),
    [timelineUser]
  );

  function handleExport() {
    if (sessionRows.length === 0) {
      toast.error("No login/logout records to export for this filter.");
      return;
    }
    exportLoginActivityExcel(sessionRows, { from, to });
    toast.success("Login activity Excel exported.");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-semibold text-xl text-ink">Login Activity</h1>
          <p className="text-sm text-ink-400 mt-0.5">
            Who's signed in, when, from where, and the authentication audit trail — separate from attendance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" icon={RefreshCw} onClick={refresh}>
            Refresh
          </Button>
          <Button variant="outline" icon={Download} onClick={handleExport}>
            Export Excel
          </Button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-ink-100">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? "border-ink text-ink" : "border-transparent text-ink-400 hover:text-ink-600"
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Select label="User" value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">All users</option>
            {userOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
          <Select label="Department" value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </Select>
          <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </Card>

      {tab === "live" && (
        <Card className="overflow-hidden">
          {liveStatus.length === 0 ? (
            <EmptyState icon={Radio} title="No one is currently logged in" message="Live sessions will appear here as users sign in." />
          ) : (
            <div className="overflow-x-auto scroll-thin">
              <table className="w-full text-sm">
                <thead className="bg-ink-50 text-ink-400 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">User</th>
                    <th className="text-left px-4 py-3 font-medium">Role</th>
                    <th className="text-left px-4 py-3 font-medium">Login time</th>
                    <th className="text-left px-4 py-3 font-medium">Location</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {liveStatus.map((row) => (
                    <tr
                      key={row.userId + row.loginAt}
                      className="hover:bg-ink-50/60 cursor-pointer"
                      onClick={() => setTimelineUser(row)}
                    >
                      <td className="px-4 py-3 font-medium text-ink">{row.userName || row.userId}</td>
                      <td className="px-4 py-3 text-ink-500 capitalize">{row.role}</td>
                      <td className="px-4 py-3 text-ink-500">{fmtDateTime(row.loginAt)}</td>
                      <td className="px-4 py-3">
                        <LocationBadge location={row.location} />
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="bg-moss-light text-moss">🟢 Online</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "history" && (
        <Card className="overflow-hidden">
          {sessionRows.length === 0 ? (
            <EmptyState icon={History} title="No sessions in this range" message="Try widening the date range or clearing filters." />
          ) : (
            <div className="overflow-x-auto scroll-thin">
              <table className="w-full text-sm">
                <thead className="bg-ink-50 text-ink-400 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">User</th>
                    <th className="text-left px-4 py-3 font-medium">Login</th>
                    <th className="text-left px-4 py-3 font-medium">Logout</th>
                    <th className="text-left px-4 py-3 font-medium">Duration</th>
                    <th className="text-left px-4 py-3 font-medium">Login location</th>
                    <th className="text-left px-4 py-3 font-medium">Logout location</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {sessionRows.map((row) => (
                    <tr key={row.id} className="hover:bg-ink-50/60 cursor-pointer" onClick={() => setTimelineUser(row)}>
                      <td className="px-4 py-3 font-medium text-ink">{row.userName || row.userId}</td>
                      <td className="px-4 py-3 text-ink-500">{fmtDateTime(row.loginAt)}</td>
                      <td className="px-4 py-3 text-ink-500">{fmtDateTime(row.logoutAt)}</td>
                      <td className="px-4 py-3 text-ink-500">
                        {row.durationMinutes != null ? formatDuration(row.durationMinutes) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <LocationBadge location={row.loginLocation} />
                      </td>
                      <td className="px-4 py-3">
                        <LocationBadge location={row.logoutLocation} />
                      </td>
                      <td className="px-4 py-3">{statusPill(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "audit" && (
        <Card className="overflow-hidden">
          {auditEvents.length === 0 ? (
            <EmptyState icon={ShieldAlert} title="No audit events" message="Successful and failed logins, logouts, and session events will appear here." />
          ) : (
            <div className="overflow-x-auto scroll-thin">
              <table className="w-full text-sm">
                <thead className="bg-ink-50 text-ink-400 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Event</th>
                    <th className="text-left px-4 py-3 font-medium">User</th>
                    <th className="text-left px-4 py-3 font-medium">Time</th>
                    <th className="text-left px-4 py-3 font-medium">Device</th>
                    <th className="text-left px-4 py-3 font-medium">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {auditEvents.map((e) => (
                    <tr key={e.id}>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                            e.type === "failed_login"
                              ? "bg-rust-light text-rust"
                              : e.type === "logout"
                              ? "bg-ink-100 text-ink-500"
                              : "bg-moss-light text-moss"
                          }`}
                        >
                          {e.type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink">{e.userName || e.userId || "Unknown"}</td>
                      <td className="px-4 py-3 text-ink-500">{fmtDateTime(e.at)}</td>
                      <td className="px-4 py-3 text-ink-400 text-xs">
                        {e.device?.browser} · {e.device?.os}
                      </td>
                      <td className="px-4 py-3 text-ink-400 text-xs">{e.reason || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <Modal
        open={!!timelineUser}
        onClose={() => setTimelineUser(null)}
        title={timelineUser ? `${timelineUser.userName || timelineUser.userId} — Activity timeline` : ""}
        size="lg"
      >
        {timelineUser && (
          <div className="space-y-4">
            {userTimeline.length === 0 ? (
              <p className="text-sm text-ink-400">No recorded activity for this user yet.</p>
            ) : (
              <ol className="space-y-4">
                {userTimeline.map((e) => (
                  <li key={e.id} className="flex gap-3">
                    <div className="flex flex-col items-center pt-1">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          e.type === "login"
                            ? "bg-moss"
                            : e.type === "logout"
                            ? "bg-sky"
                            : "bg-rust"
                        }`}
                      />
                      <span className="flex-1 w-px bg-ink-100 mt-1" />
                    </div>
                    <div className="pb-2 min-w-0">
                      <p className="text-sm font-medium text-ink capitalize">
                        {e.type.replace("_", " ")}{" "}
                        <span className="text-ink-400 font-normal">· {fmtDateTime(e.at)}</span>
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-ink-400">
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={12} /> <LocationBadge location={e.location} />
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Monitor size={12} /> {e.device?.browser} · {e.device?.os}
                        </span>
                        {e.durationMinutes != null && (
                          <span className="inline-flex items-center gap-1">
                            <Clock size={12} /> {formatDuration(e.durationMinutes)}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
