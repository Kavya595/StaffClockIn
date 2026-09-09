import { useMemo, useState } from "react";
import { CalendarOff, Send, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLeaves } from "../../hooks/useLeaves";
import { useSettings } from "../../hooks/useSettings";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Select from "../../components/common/Select";
import EmptyState from "../../components/common/EmptyState";
import { useToast } from "../../hooks/useToast";
import { useLeaveTypes } from "../../hooks/useLeaveTypes";
import { formatDisplayDate, todayISO } from "../../utils/dateUtils";
import { summarizeLeaveBalance } from "../../services/leaveService";
import { LEAVE_STATUS, LEAVE_STATUS_LABELS, LEAVE_STATUS_COLORS } from "../../constants/storageKeys";

function LeaveStatusBadge({ status }) {
  const c = LEAVE_STATUS_COLORS[status] || LEAVE_STATUS_COLORS.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {LEAVE_STATUS_LABELS[status] || status}
    </span>
  );
}

export default function StaffLeaves() {
  const { user } = useAuth();
  const { leaves, requestLeave, cancelLeave } = useLeaves();
  const { settings } = useSettings();
  const { leaveTypes, leaveReasons } = useLeaveTypes();
  const toast = useToast();

  const [fromDate, setFromDate] = useState(todayISO());
  const [toDate, setToDate] = useState(todayISO());
  const [leaveType, setLeaveType] = useState("");
  const [reasonChoice, setReasonChoice] = useState("");
  const [customReason, setCustomReason] = useState("");

  const myLeaves = useMemo(
    () => leaves.filter((l) => l.staffId === user.id).sort((a, b) => (b.requestedAt || "").localeCompare(a.requestedAt || "")),
    [leaves, user.id]
  );

  // `leaves` isn't read inside the callback directly — summarizeLeaveBalance re-reads
  // storage itself — but it's listed so the balance recomputes after a new request.
  const balance = useMemo(() => summarizeLeaveBalance(user.id, settings), [user.id, settings, leaves]); // eslint-disable-line react-hooks/exhaustive-deps
  const pendingCount = myLeaves.filter((l) => l.status === LEAVE_STATUS.PENDING).length;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!fromDate || !toDate) {
      toast.error("Pick both a start and end date.");
      return;
    }
    if (toDate < fromDate) {
      toast.error("End date can't be before the start date.");
      return;
    }
    const reason = reasonChoice === "__other__" ? customReason : reasonChoice;
    try {
      await requestLeave(user.id, { fromDate, toDate, reason, type: leaveType || "leave" });
      toast.success("Leave request submitted.");
      setReasonChoice("");
      setCustomReason("");
    } catch (err) {
      toast.error(err.message || "Could not submit the leave request.");
    }
  }

  const summaryCards = [
    { label: "Annual Allowance", value: `${balance.annualLeaveDays}d` },
    { label: "Used This Year", value: `${balance.used}d`, color: "text-honey" },
    { label: "Remaining", value: `${balance.remaining}d`, color: "text-moss" },
    { label: "Pending Requests", value: pendingCount, color: pendingCount ? "text-brass-600" : undefined },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold text-ink">My Leave</h1>
        <p className="text-sm text-ink-400">Request time off and track the status of your requests.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {summaryCards.map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-ink-400 mb-1">{s.label}</p>
            <p className={`font-display text-lg font-semibold tabular ${s.color || "text-ink"}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4 sm:p-5">
        <h2 className="font-display font-semibold text-sm text-ink mb-4">Request leave</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="From" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} required />
            <Input label="To" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select label="Leave type" value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
              <option value="">Select type...</option>
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </Select>
            <Select label="Reason (optional)" value={reasonChoice} onChange={(e) => setReasonChoice(e.target.value)}>
              <option value="">Select reason...</option>
              {leaveReasons.map((r) => (
                <option key={r.id} value={r.name}>{r.name}</option>
              ))}
              <option value="__other__">Other...</option>
            </Select>
          </div>
          {reasonChoice === "__other__" && (
            <Input
              label="Tell us more"
              placeholder="e.g. Family event"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
            />
          )}
          <Button type="submit" variant="accent" icon={Send}>Submit request</Button>
        </form>
      </Card>

      <Card className="p-4 sm:p-5">
        <h2 className="font-display font-semibold text-sm text-ink mb-4">My requests</h2>
        {myLeaves.length === 0 ? (
          <EmptyState icon={CalendarOff} title="No leave requests yet" message="Requests you submit will appear here." />
        ) : (
          <div className="space-y-2.5">
            {myLeaves.map((l) => (
              <div key={l.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-ink-100 rounded-card p-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">
                    {formatDisplayDate(l.fromDate)} – {formatDisplayDate(l.toDate)} · {l.days} day{l.days !== 1 ? "s" : ""}
                    {l.type && l.type !== "leave" && <span className="text-ink-400 font-normal"> · {l.type}</span>}
                  </p>
                  {l.reason && <p className="text-xs text-ink-400 mt-0.5 truncate">{l.reason}</p>}
                  {l.adminNote && <p className="text-xs text-ink-300 mt-0.5 italic">Admin note: {l.adminNote}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <LeaveStatusBadge status={l.status} />
                  {l.status === LEAVE_STATUS.PENDING && (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={X}
                      onClick={async () => {
                        try {
                          await cancelLeave(l.id);
                          toast.success("Request cancelled.");
                        } catch (err) {
                          toast.error(err.message || "Could not cancel the request.");
                        }
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
