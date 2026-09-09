import { useMemo, useState } from "react";
import { CalendarOff, Check, X, Inbox } from "lucide-react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Select from "../components/common/Select";
import Input from "../components/common/Input";
import Modal from "../components/common/Modal";
import EmptyState from "../components/common/EmptyState";
import { useLeaves } from "../hooks/useLeaves";
import { useStaff } from "../hooks/useStaff";
import { useToast } from "../hooks/useToast";
import { formatDisplayDate } from "../utils/dateUtils";
import { LEAVE_STATUS, LEAVE_STATUS_LABELS, LEAVE_STATUS_COLORS } from "../constants/storageKeys";

function LeaveStatusBadge({ status }) {
  const c = LEAVE_STATUS_COLORS[status] || LEAVE_STATUS_COLORS.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {LEAVE_STATUS_LABELS[status] || status}
    </span>
  );
}

const FILTERS = [
  { value: "", label: "All requests" },
  { value: LEAVE_STATUS.PENDING, label: "Pending" },
  { value: LEAVE_STATUS.APPROVED, label: "Approved" },
  { value: LEAVE_STATUS.REJECTED, label: "Rejected" },
];

export default function Leaves() {
  const { leaves, approveLeave, rejectLeave } = useLeaves();
  const { staff } = useStaff();
  const toast = useToast();

  const [statusFilter, setStatusFilter] = useState(LEAVE_STATUS.PENDING);
  const [decisionTarget, setDecisionTarget] = useState(null); // { leave, action }
  const [adminNote, setAdminNote] = useState("");

  const staffById = useMemo(() => Object.fromEntries(staff.map((s) => [s.id, s])), [staff]);

  const filtered = useMemo(() => {
    return leaves
      .filter((l) => (statusFilter ? l.status === statusFilter : true))
      .filter((l) => l.status !== "cancelled" || statusFilter === "cancelled")
      .sort((a, b) => (b.requestedAt || "").localeCompare(a.requestedAt || ""));
  }, [leaves, statusFilter]);

  const pendingCount = leaves.filter((l) => l.status === LEAVE_STATUS.PENDING).length;

  function openDecision(leave, action) {
    setDecisionTarget({ leave, action });
    setAdminNote("");
  }

  async function confirmDecision() {
    if (!decisionTarget) return;
    const { leave, action } = decisionTarget;
    const staffMember = staffById[leave.staffId];
    try {
      if (action === "approve") {
        await approveLeave(leave.id, adminNote);
        toast.success(`Leave approved for ${staffMember?.name || "staff member"}.`);
      } else {
        await rejectLeave(leave.id, adminNote);
        toast.success(`Leave rejected for ${staffMember?.name || "staff member"}.`);
      }
    } catch (err) {
      toast.error(err.message || "Could not save the decision.");
    } finally {
      setDecisionTarget(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">Leave Requests</h1>
          <p className="text-sm text-ink-400">
            {pendingCount > 0 ? `${pendingCount} request${pendingCount !== 1 ? "s" : ""} awaiting your decision` : "All caught up"}
          </p>
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-48">
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </Select>
      </div>

      <Card className="p-4 sm:p-5">
        {filtered.length === 0 ? (
          <EmptyState icon={Inbox} title="No leave requests" message="Requests submitted by staff from their portal will show up here." />
        ) : (
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-ink-100">
                  {["Employee", "Department", "From", "To", "Days", "Type", "Reason", "Status", "Actions"].map((h) => (
                    <th key={h} className="pb-2.5 text-[11px] font-medium text-ink-400 uppercase tracking-wide pr-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => {
                  const s = staffById[l.staffId];
                  return (
                    <tr key={l.id} className="border-b border-ink-50 last:border-0">
                      <td className="py-2.5 pr-3 text-sm text-ink whitespace-nowrap">{s?.name || "Unknown"}</td>
                      <td className="py-2.5 pr-3 text-sm text-ink-500 whitespace-nowrap">{s?.department || "—"}</td>
                      <td className="py-2.5 pr-3 text-sm text-ink-500 whitespace-nowrap">{formatDisplayDate(l.fromDate)}</td>
                      <td className="py-2.5 pr-3 text-sm text-ink-500 whitespace-nowrap">{formatDisplayDate(l.toDate)}</td>
                      <td className="py-2.5 pr-3 text-sm tabular text-ink-500 whitespace-nowrap">{l.days}</td>
                      <td className="py-2.5 pr-3 text-sm text-ink-500 whitespace-nowrap">{l.type && l.type !== "leave" ? l.type : "—"}</td>
                      <td className="py-2.5 pr-3 text-sm text-ink-500 max-w-[220px] truncate" title={l.reason}>{l.reason || "—"}</td>
                      <td className="py-2.5 pr-3"><LeaveStatusBadge status={l.status} /></td>
                      <td className="py-2.5 pr-3">
                        {l.status === LEAVE_STATUS.PENDING ? (
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="outline" icon={Check} onClick={() => openDecision(l, "approve")}>Approve</Button>
                            <Button size="sm" variant="ghost" icon={X} onClick={() => openDecision(l, "reject")}>Reject</Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-ink-300">
                            {l.decidedBy?.name ? `By ${l.decidedBy.name}` : "—"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={!!decisionTarget}
        onClose={() => setDecisionTarget(null)}
        title={decisionTarget?.action === "approve" ? "Approve leave request" : "Reject leave request"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDecisionTarget(null)}>Cancel</Button>
            <Button
              variant={decisionTarget?.action === "approve" ? "accent" : "danger"}
              icon={decisionTarget?.action === "approve" ? Check : X}
              onClick={confirmDecision}
            >
              {decisionTarget?.action === "approve" ? "Approve" : "Reject"}
            </Button>
          </>
        }
      >
        {decisionTarget && (
          <div className="space-y-3">
            <p className="text-sm text-ink-500">
              {staffById[decisionTarget.leave.staffId]?.name} · {formatDisplayDate(decisionTarget.leave.fromDate)} – {formatDisplayDate(decisionTarget.leave.toDate)} ({decisionTarget.leave.days} day{decisionTarget.leave.days !== 1 ? "s" : ""})
            </p>
            {decisionTarget.leave.reason && (
              <p className="text-sm text-ink-400 italic">"{decisionTarget.leave.reason}"</p>
            )}
            <Input
              label="Note (optional)"
              placeholder="Visible to the staff member"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
            />
            {decisionTarget.action === "approve" && (
              <p className="text-[11px] text-ink-400 flex items-center gap-1.5">
                <CalendarOff size={12} />
                Every day in this range will be marked "On Leave" in attendance and excluded from absent counts.
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
