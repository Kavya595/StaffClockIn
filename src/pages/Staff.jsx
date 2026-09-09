import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Users, Mail, Phone, ShieldCheck, ShieldOff, Eye } from "lucide-react";
import { useStaff } from "../hooks/useStaff";
import { useDepartments } from "../hooks/useDepartments";
import { useAttendance } from "../hooks/useAttendance";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import SearchInput from "../components/common/SearchInput";
import Select from "../components/common/Select";
import Badge from "../components/common/Badge";
import EmptyState from "../components/common/EmptyState";
import ConfirmDialog from "../components/common/ConfirmDialog";
import StaffFormModal from "../components/staff/StaffFormModal";
import { useToast } from "../hooks/useToast";
import { summarize } from "../utils/calculations";

export default function Staff() {
  const { staff, add, update, remove } = useStaff();
  const { departments } = useDepartments();
  const { records } = useAttendance();
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = useMemo(() => {
    let list = staff.filter((s) => {
      if (department && s.department !== department) return false;
      if (
        search &&
        !`${s.name} ${s.role} ${s.email} ${s.loginId || ""} ${s.department}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
        return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "department") return a.department.localeCompare(b.department);
      if (sortBy === "joinDate") return (b.joinDate || "").localeCompare(a.joinDate || "");
      return 0;
    });
    return list;
  }, [staff, department, search, sortBy]);

  async function handleSave(form) {
    try {
      if (editing) {
        await update(editing.id, form);
        toast.success("Staff member updated.");
      } else {
        await add(form);
        toast.success("Staff member added.");
      }
    } catch (err) {
      toast.error(err.message || "Could not save staff member.");
    }
  }

  async function handleDelete(id) {
    try {
      await remove(id);
      toast.success("Staff member removed.");
    } catch (err) {
      toast.error(err.message || "Could not remove staff member.");
    }
  }

  async function toggleStatus(s) {
    const next = s.status === "active" ? "inactive" : "active";
    try {
      await update(s.id, { status: next });
      toast.success(next === "active" ? `${s.name} activated.` : `${s.name} deactivated.`);
    } catch (err) {
      toast.error(err.message || "Could not update staff status.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">Staff</h1>
          <p className="text-sm text-ink-400">{staff.length} team member{staff.length !== 1 ? "s" : ""}</p>
        </div>
        <Button variant="accent" icon={Plus} onClick={() => { setEditing(null); setModalOpen(true); }}>
          Add staff
        </Button>
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center mb-5">
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, employee ID, department..." />
          <Select value={department} onChange={(e) => setDepartment(e.target.value)} className="sm:w-48">
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </Select>
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sm:w-44">
            <option value="name">Sort: Name</option>
            <option value="department">Sort: Department</option>
            <option value="joinDate">Sort: Newest</option>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={staff.length === 0 ? "No staff yet" : "No matches"}
            message={staff.length === 0 ? "Add your first team member to get started." : "Try a different search or filter."}
            action={
              staff.length === 0 && (
                <Button variant="accent" icon={Plus} onClick={() => { setEditing(null); setModalOpen(true); }}>
                  Add staff
                </Button>
              )
            }
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((s) => {
              const staffRecords = records.filter((r) => r.staffId === s.id);
              const sum = summarize(staffRecords);
              return (
                <div key={s.id} className="border border-ink-100 rounded-card p-4 hover:border-ink-200 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <Link to={`/staff/${s.id}`} className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-display font-semibold text-white shrink-0"
                        style={{ backgroundColor: s.avatarColor || "#120D9E" }}
                      >
                        {s.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{s.name}</p>
                        <p className="text-[11px] text-ink-400 truncate">{s.role}</p>
                      </div>
                    </Link>
                    <div className="flex gap-1 shrink-0">
                      <Link
                        to={`/staff/${s.id}`}
                        title="View attendance details"
                        className="p-1.5 rounded-full text-ink-400 hover:text-ink hover:bg-ink-50"
                      >
                        <Eye size={14} />
                      </Link>
                      <button
                        onClick={() => toggleStatus(s)}
                        title={s.status === "active" ? "Deactivate portal login" : "Activate portal login"}
                        className={`p-1.5 rounded-full hover:bg-ink-50 ${s.status === "active" ? "text-moss" : "text-ink-300"}`}
                      >
                        {s.status === "active" ? <ShieldCheck size={14} /> : <ShieldOff size={14} />}
                      </button>
                      <button onClick={() => { setEditing(s); setModalOpen(true); }} className="p-1.5 rounded-full text-ink-400 hover:text-ink hover:bg-ink-50">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setConfirmDelete(s)} className="p-1.5 rounded-full text-ink-400 hover:text-rust hover:bg-rust-light/60">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Badge>{s.department}</Badge>
                    {s.loginId && <Badge>ID: {s.loginId}</Badge>}
                    <span className={`text-[11px] font-medium ${s.status === "active" ? "text-moss" : "text-rust"}`}>
                      {s.status === "active" ? "Portal active" : "Portal disabled"}
                    </span>
                    <span className="text-[11px] text-ink-400 tabular">{sum.percentage.toFixed(0)}% attendance</span>
                  </div>
                  <div className="space-y-1 text-[11px] text-ink-400">
                    {s.email && <p className="flex items-center gap-1.5 truncate"><Mail size={12} />{s.email}</p>}
                    {s.phone && <p className="flex items-center gap-1.5"><Phone size={12} />{s.phone}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <StaffFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        editing={editing}
        departments={departments}
        existingStaff={staff}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete.id)}
        title="Remove staff member?"
        message={`This will permanently remove ${confirmDelete?.name || "this staff member"} and cannot be undone. Their attendance history will remain in reports.`}
        confirmLabel="Remove"
      />
    </div>
  );
}
