import { useMemo, useRef, useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Download, Upload, AlertTriangle, Building2, Tag, MessageSquare, CalendarHeart, Bell, Cake } from "lucide-react";
import Card from "../components/common/Card";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import ConfirmDialog from "../components/common/ConfirmDialog";
import EmptyState from "../components/common/EmptyState";
import HolidayFormModal from "../components/settings/HolidayFormModal";
import { useDepartments } from "../hooks/useDepartments";
import { useSettings } from "../hooks/useSettings";
import { useToast } from "../hooks/useToast";
import { useLeaveTypes } from "../hooks/useLeaveTypes";
import { useHolidays } from "../hooks/useHolidays";
import { validateDepartmentName } from "../utils/validation";
import * as backupService from "../services/backupService";
import * as holidayService from "../services/holidayService";
import { formatDisplayDate } from "../utils/dateUtils";
import { HOLIDAY_TYPE_LABELS, HOLIDAY_TYPE_COLORS } from "../constants/storageKeys";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function SettingsPage() {
  const { departments, add, update, remove } = useDepartments();
  const { settings, save } = useSettings();
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [newDept, setNewDept] = useState("");
  const [deptError, setDeptError] = useState("");
  const [editingDept, setEditingDept] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [confirmDeleteDept, setConfirmDeleteDept] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmImport, setConfirmImport] = useState(null);
  const [localSettings, setLocalSettings] = useState(settings);

  // `settings` starts as whatever's cached locally and is replaced once
  // the Sheets sync (useSettings' mount effect) resolves. Mirror that one
  // update into the edit form — but only that first sync, so it never
  // clobbers changes the admin is actively typing afterward.
  const initialSettingsRef = useRef(settings);
  useEffect(() => {
    if (settings !== initialSettingsRef.current) {
      setLocalSettings(settings);
      initialSettingsRef.current = settings; // stop syncing after this one update
    }
  }, [settings]);

  // Leave Type & Leave Reason management
  const {
    leaveTypes, leaveReasons,
    addType, updateType, removeType,
    addReason, updateReason, removeReason,
  } = useLeaveTypes();
  const [newLeaveType, setNewLeaveType] = useState("");
  const [editingType, setEditingType] = useState(null);
  const [editTypeValue, setEditTypeValue] = useState("");
  const [confirmDeleteType, setConfirmDeleteType] = useState(null);
  const [newLeaveReason, setNewLeaveReason] = useState("");
  const [editingReason, setEditingReason] = useState(null);
  const [editReasonValue, setEditReasonValue] = useState("");
  const [confirmDeleteReason, setConfirmDeleteReason] = useState(null);

  // Holiday management
  const { holidays, add: addHoliday, update: updateHoliday, remove: removeHoliday } = useHolidays();
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [confirmDeleteHoliday, setConfirmDeleteHoliday] = useState(null);
  const sortedHolidays = useMemo(
    () => [...holidays].sort((a, b) => a.date.slice(5).localeCompare(b.date.slice(5))),
    [holidays]
  );

  // Birthday/holiday reminders — next 30 days
  const upcomingHolidayMonths = useMemo(() => holidayService.getHolidaysByUpcomingMonths(2), [holidays]); // eslint-disable-line react-hooks/exhaustive-deps
  const upcomingBirthdays = useMemo(() => holidayService.getUpcomingBirthdays(30), []);

  async function handleAddLeaveType(e) {
    e.preventDefault();
    if (!newLeaveType.trim()) return;
    try {
      await addType({ name: newLeaveType.trim() });
      setNewLeaveType("");
      toast.success("Leave type added.");
    } catch (err) {
      toast.error(err.message || "Could not add leave type.");
    }
  }

  async function handleSaveLeaveType(type) {
    if (!editTypeValue.trim()) return;
    try {
      await updateType(type.id, { name: editTypeValue.trim() });
      setEditingType(null);
      toast.success("Leave type updated.");
    } catch (err) {
      toast.error(err.message || "Could not update leave type.");
    }
  }

  async function handleAddLeaveReason(e) {
    e.preventDefault();
    if (!newLeaveReason.trim()) return;
    try {
      await addReason(newLeaveReason.trim());
      setNewLeaveReason("");
      toast.success("Leave reason added.");
    } catch (err) {
      toast.error(err.message || "Could not add leave reason.");
    }
  }

  async function handleSaveLeaveReason(reason) {
    if (!editReasonValue.trim()) return;
    try {
      await updateReason(reason.id, editReasonValue.trim());
      setEditingReason(null);
      toast.success("Leave reason updated.");
    } catch (err) {
      toast.error(err.message || "Could not update leave reason.");
    }
  }

  async function handleSaveHoliday(data) {
    try {
      if (editingHoliday) {
        await updateHoliday(editingHoliday.id, data);
        toast.success("Holiday updated.");
      } else {
        await addHoliday(data);
        toast.success("Holiday added.");
      }
      setEditingHoliday(null);
    } catch (err) {
      toast.error(err.message || "Could not save holiday.");
    }
  }

  async function handleAddDept(e) {
    e.preventDefault();
    const errors = validateDepartmentName(newDept, departments);
    if (errors.name) {
      setDeptError(errors.name);
      return;
    }
    try {
      await add(newDept);
      setNewDept("");
      setDeptError("");
      toast.success("Department added.");
    } catch (err) {
      toast.error(err.message || "Could not add department.");
    }
  }

  async function handleSaveEdit(dept) {
    const errors = validateDepartmentName(editValue, departments, dept.id);
    if (errors.name) {
      toast.error(errors.name);
      return;
    }
    try {
      await update(dept.id, editValue);
      setEditingDept(null);
      toast.success("Department updated.");
    } catch (err) {
      toast.error(err.message || "Could not update department.");
    }
  }

  async function handleSaveSettings(e) {
    e.preventDefault();
    try {
      await save(localSettings);
      toast.success("Settings saved.");
    } catch (err) {
      toast.error(err.message || "Could not save settings.");
    }
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const json = await backupService.readFileAsJSON(file);
      const error = backupService.validateBackupShape(json);
      if (error) {
        toast.error(error);
      } else {
        setConfirmImport(json);
      }
    } catch (err) {
      toast.error(err.message || "Could not read file.");
    } finally {
      e.target.value = "";
    }
  }

  function performImport() {
    const result = backupService.importBackup(confirmImport);
    if (result.success) {
      toast.success("Backup restored. Reloading...");
      setTimeout(() => window.location.reload(), 700);
    } else {
      toast.error(result.error);
    }
  }

  function performClear() {
    backupService.clearAllAppData();
    toast.success("Data cleared. Reloading...");
    setTimeout(() => window.location.reload(), 700);
  }

  async function handleConfirmDeleteDept() {
    if (!confirmDeleteDept) return;
    try {
      await remove(confirmDeleteDept.id);
      toast.success("Department removed.");
    } catch (err) {
      toast.error(err.message || "Could not remove department.");
    } finally {
      setConfirmDeleteDept(null);
    }
  }

  async function handleConfirmDeleteType() {
    if (!confirmDeleteType) return;
    try {
      await removeType(confirmDeleteType.id);
      toast.success("Leave type removed.");
    } catch (err) {
      toast.error(err.message || "Could not remove leave type.");
    } finally {
      setConfirmDeleteType(null);
    }
  }

  async function handleConfirmDeleteReason() {
    if (!confirmDeleteReason) return;
    try {
      await removeReason(confirmDeleteReason.id);
      toast.success("Leave reason removed.");
    } catch (err) {
      toast.error(err.message || "Could not remove leave reason.");
    } finally {
      setConfirmDeleteReason(null);
    }
  }

  async function handleConfirmDeleteHoliday() {
    if (!confirmDeleteHoliday) return;
    try {
      await removeHoliday(confirmDeleteHoliday.id);
      toast.success("Holiday removed.");
    } catch (err) {
      toast.error(err.message || "Could not remove holiday.");
    } finally {
      setConfirmDeleteHoliday(null);
    }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="font-display text-xl font-semibold text-ink">Settings</h1>
        <p className="text-sm text-ink-400">Manage departments, preferences, and your data</p>
      </div>

      <Card className="p-5">
        <h2 className="font-display font-semibold text-sm text-ink mb-4">Organization</h2>
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <Input
            label="Organization name"
            value={localSettings.organizationName}
            onChange={(e) => setLocalSettings((s) => ({ ...s, organizationName: e.target.value }))}
          />
          <div className="grid sm:grid-cols-3 gap-3">
            <Input
              label="Work start time"
              type="time"
              value={localSettings.workStartTime}
              onChange={(e) => setLocalSettings((s) => ({ ...s, workStartTime: e.target.value }))}
            />
            <Input
              label="Late after (minutes)"
              type="number"
              min="0"
              value={localSettings.lateAfterMinutes}
              onChange={(e) => setLocalSettings((s) => ({ ...s, lateAfterMinutes: Number(e.target.value) }))}
            />
            <Input
              label="Required attendance %"
              type="number"
              min="0"
              max="100"
              value={localSettings.requiredAttendancePercentage}
              onChange={(e) => setLocalSettings((s) => ({ ...s, requiredAttendancePercentage: Number(e.target.value) }))}
            />
          </div>
          <Button type="submit" variant="accent">Save settings</Button>
        </form>
      </Card>

      <Card className="p-5">
        <h2 className="font-display font-semibold text-sm text-ink mb-1">Attendance rules</h2>
        <p className="text-xs text-ink-400 mb-4">
          Controls how login/logout status and working hours are calculated across the whole app — nothing else needs editing.
        </p>
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Input
              label="Login time"
              type="time"
              value={localSettings.loginTime}
              onChange={(e) => setLocalSettings((s) => ({ ...s, loginTime: e.target.value }))}
              hint="Scheduled start time"
            />
            <Input
              label="Grace period (minutes)"
              type="number"
              min="0"
              value={localSettings.graceMinutes}
              onChange={(e) => setLocalSettings((s) => ({ ...s, graceMinutes: Number(e.target.value) }))}
              hint={`On time until ${localSettings.loginTime || "--"} + grace`}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input
              label="Logout time"
              type="time"
              value={localSettings.logoutTime}
              onChange={(e) => setLocalSettings((s) => ({ ...s, logoutTime: e.target.value }))}
              hint="Before this is an early logout"
            />
            <Input
              label="Maximum logout time"
              type="time"
              value={localSettings.logoutMaxTime}
              onChange={(e) => setLocalSettings((s) => ({ ...s, logoutMaxTime: e.target.value }))}
              hint="After this a logout is expired"
            />
          </div>
          <div>
            <span className="block text-xs font-medium text-ink-500 mb-1.5">Required working hours</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="23"
                value={Math.floor((localSettings.requiredWorkMinutes ?? 510) / 60)}
                onChange={(e) => {
                  const hours = Number(e.target.value) || 0;
                  const mins = (localSettings.requiredWorkMinutes ?? 510) % 60;
                  setLocalSettings((s) => ({ ...s, requiredWorkMinutes: hours * 60 + mins }));
                }}
                className="w-20 rounded-card border border-ink-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass/30 focus:border-brass"
              />
              <span className="text-sm text-ink-400">h</span>
              <input
                type="number"
                min="0"
                max="59"
                value={(localSettings.requiredWorkMinutes ?? 510) % 60}
                onChange={(e) => {
                  const mins = Number(e.target.value) || 0;
                  const hours = Math.floor((localSettings.requiredWorkMinutes ?? 510) / 60);
                  setLocalSettings((s) => ({ ...s, requiredWorkMinutes: hours * 60 + mins }));
                }}
                className="w-20 rounded-card border border-ink-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass/30 focus:border-brass"
              />
              <span className="text-sm text-ink-400">m</span>
            </div>
          </div>
          <Button type="submit" variant="accent">Save settings</Button>
        </form>
      </Card>

      <Card className="p-5">
        <h2 className="font-display font-semibold text-sm text-ink mb-4">Departments</h2>
        <form onSubmit={handleAddDept} className="flex gap-2 mb-4">
          <div className="flex-1">
            <Input
              placeholder="New department name"
              value={newDept}
              onChange={(e) => { setNewDept(e.target.value); setDeptError(""); }}
              error={deptError}
            />
          </div>
          <Button type="submit" variant="outline" icon={Plus}>Add</Button>
        </form>

        {departments.length === 0 ? (
          <EmptyState icon={Building2} title="No departments" message="Add a department to organize staff." />
        ) : (
          <ul className="divide-y divide-ink-50">
            {departments.map((d) => (
              <li key={d.id} className="py-2.5 flex items-center justify-between gap-2">
                {editingDept === d.id ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1 rounded-card border border-ink-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass/40"
                    />
                    <Button size="sm" variant="accent" onClick={() => handleSaveEdit(d)}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingDept(null)}>Cancel</Button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm text-ink">{d.name}</span>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditingDept(d.id); setEditValue(d.name); }} className="p-1.5 rounded-full text-ink-400 hover:text-ink hover:bg-ink-50">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setConfirmDeleteDept(d)} className="p-1.5 rounded-full text-ink-400 hover:text-rust hover:bg-rust-light/60">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-display font-semibold text-sm text-ink mb-1 flex items-center gap-2">
          <Tag size={15} className="text-brass-500" /> Leave Types
        </h2>
        <p className="text-xs text-ink-400 mb-4">Categories staff choose from when requesting leave (e.g. Sick, Casual).</p>
        <form onSubmit={handleAddLeaveType} className="flex gap-2 mb-4">
          <div className="flex-1">
            <Input placeholder="New leave type name" value={newLeaveType} onChange={(e) => setNewLeaveType(e.target.value)} />
          </div>
          <Button type="submit" variant="outline" icon={Plus}>Add</Button>
        </form>
        {leaveTypes.length === 0 ? (
          <EmptyState icon={Tag} title="No leave types" message="Add a leave type for staff to choose from." />
        ) : (
          <ul className="divide-y divide-ink-50">
            {leaveTypes.map((t) => (
              <li key={t.id} className="py-2.5 flex items-center justify-between gap-2">
                {editingType === t.id ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      autoFocus
                      value={editTypeValue}
                      onChange={(e) => setEditTypeValue(e.target.value)}
                      className="flex-1 rounded-card border border-ink-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass/40"
                    />
                    <Button size="sm" variant="accent" onClick={() => handleSaveLeaveType(t)}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingType(null)}>Cancel</Button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm text-ink flex items-center gap-2">
                      {t.name}
                      {!t.paid && <span className="text-[10px] rounded-full px-2 py-0.5 bg-ink-100 text-ink-500">Unpaid</span>}
                    </span>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditingType(t.id); setEditTypeValue(t.name); }} className="p-1.5 rounded-full text-ink-400 hover:text-ink hover:bg-ink-50">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setConfirmDeleteType(t)} className="p-1.5 rounded-full text-ink-400 hover:text-rust hover:bg-rust-light/60">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-display font-semibold text-sm text-ink mb-1 flex items-center gap-2">
          <MessageSquare size={15} className="text-brass-500" /> Leave Reasons
        </h2>
        <p className="text-xs text-ink-400 mb-4">Common reasons staff can pick when submitting a leave request.</p>
        <form onSubmit={handleAddLeaveReason} className="flex gap-2 mb-4">
          <div className="flex-1">
            <Input placeholder="New leave reason" value={newLeaveReason} onChange={(e) => setNewLeaveReason(e.target.value)} />
          </div>
          <Button type="submit" variant="outline" icon={Plus}>Add</Button>
        </form>
        {leaveReasons.length === 0 ? (
          <EmptyState icon={MessageSquare} title="No leave reasons" message="Add a reason for staff to choose from." />
        ) : (
          <ul className="divide-y divide-ink-50">
            {leaveReasons.map((r) => (
              <li key={r.id} className="py-2.5 flex items-center justify-between gap-2">
                {editingReason === r.id ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      autoFocus
                      value={editReasonValue}
                      onChange={(e) => setEditReasonValue(e.target.value)}
                      className="flex-1 rounded-card border border-ink-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass/40"
                    />
                    <Button size="sm" variant="accent" onClick={() => handleSaveLeaveReason(r)}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingReason(null)}>Cancel</Button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm text-ink">{r.name}</span>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditingReason(r.id); setEditReasonValue(r.name); }} className="p-1.5 rounded-full text-ink-400 hover:text-ink hover:bg-ink-50">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setConfirmDeleteReason(r)} className="p-1.5 rounded-full text-ink-400 hover:text-rust hover:bg-rust-light/60">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display font-semibold text-sm text-ink flex items-center gap-2">
            <CalendarHeart size={15} className="text-brass-500" /> Holidays
          </h2>
          <Button size="sm" variant="outline" icon={Plus} onClick={() => { setEditingHoliday(null); setHolidayModalOpen(true); }}>Add holiday</Button>
        </div>
        <p className="text-xs text-ink-400 mb-4">
          Telugu festivals, national holidays, freedom-fighter days &amp; regional observances. View them on the{" "}
          <a href="/holidays" className="underline text-brass-600">Holiday Calendar</a>.
        </p>
        {sortedHolidays.length === 0 ? (
          <EmptyState icon={CalendarHeart} title="No holidays" message="Add your first holiday." />
        ) : (
          <ul className="divide-y divide-ink-50">
            {sortedHolidays.map((h) => {
              const c = HOLIDAY_TYPE_COLORS[h.type] || HOLIDAY_TYPE_COLORS.public;
              return (
                <li key={h.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-ink truncate">{h.name}</p>
                    <p className="text-[11px] text-ink-400">
                      {formatDisplayDate(h.date)}{h.recurring ? " · Repeats yearly" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${c.bg} ${c.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                      {HOLIDAY_TYPE_LABELS[h.type] || h.type}
                    </span>
                    <button onClick={() => { setEditingHoliday(h); setHolidayModalOpen(true); }} className="p-1.5 rounded-full text-ink-400 hover:text-ink hover:bg-ink-50">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setConfirmDeleteHoliday(h)} className="p-1.5 rounded-full text-ink-400 hover:text-rust hover:bg-rust-light/60">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-display font-semibold text-sm text-ink mb-1 flex items-center gap-2">
          <CalendarHeart size={15} className="text-brass-500" /> Holidays by month
        </h2>
        <p className="text-xs text-ink-400 mb-4">This month, next month &amp; the month after — wraps from December into January.</p>
        <div className="space-y-4">
          {upcomingHolidayMonths.map(({ year, month, holidays: monthHolidays }, idx) => (
            <div key={`${year}-${month}`}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400 mb-1.5">
                {idx === 0 ? "This month · " : idx === 1 ? "Next month · " : "Month after · "}
                {MONTH_NAMES[month]} {year}
              </p>
              {monthHolidays.length === 0 ? (
                <p className="text-xs text-ink-300 pl-0.5">No holidays.</p>
              ) : (
                <ul className="divide-y divide-ink-50">
                  {monthHolidays.map((h) => {
                    const c = HOLIDAY_TYPE_COLORS[h.type] || HOLIDAY_TYPE_COLORS.public;
                    return (
                      <li key={h.id} className="py-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <CalendarHeart size={14} className="text-ink-300 shrink-0" />
                          <span className="text-sm text-ink truncate">{h.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${c.bg} ${c.text}`}>
                            {HOLIDAY_TYPE_LABELS[h.type] || h.type}
                          </span>
                          <span className="text-xs text-ink-400 tabular">{formatDisplayDate(h.occursOn)}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-display font-semibold text-sm text-ink mb-1 flex items-center gap-2">
          <Bell size={15} className="text-brass-500" /> Upcoming birthdays
        </h2>
        <p className="text-xs text-ink-400 mb-4">Staff birthdays in the next 30 days.</p>
        {upcomingBirthdays.length === 0 ? (
          <EmptyState icon={Bell} title="Nothing coming up" message="No birthdays in the next 30 days." />
        ) : (
          <ul className="divide-y divide-ink-50">
            {upcomingBirthdays.map((b) => (
              <li key={`bday-${b.staff.id}`} className="py-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Cake size={15} className="text-ink-300 shrink-0" />
                  <span className="text-sm text-ink truncate">{b.staff.name}'s birthday</span>
                </div>
                <span className="text-xs text-ink-400 tabular shrink-0">{formatDisplayDate(b.occursOn)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-display font-semibold text-sm text-ink mb-1">Backup & restore</h2>
        <p className="text-xs text-ink-400 mb-4">Export all data to a JSON file, or restore from a previous backup.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" icon={Download} onClick={backupService.exportBackup}>Export backup</Button>
          <Button variant="outline" icon={Upload} onClick={() => fileInputRef.current?.click()}>Import backup</Button>
          <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
        </div>
      </Card>

      <Card className="p-5 border-rust/30">
        <h2 className="font-display font-semibold text-sm text-rust mb-1 flex items-center gap-2">
          <AlertTriangle size={16} /> Danger zone
        </h2>
        <p className="text-xs text-ink-400 mb-4">Permanently clear all staff and attendance data from this browser.</p>
        <Button variant="danger" onClick={() => setConfirmClear(true)}>Clear all data</Button>
      </Card>

      <ConfirmDialog
        open={!!confirmDeleteDept}
        onClose={() => setConfirmDeleteDept(null)}
        onConfirm={handleConfirmDeleteDept}
        title="Delete department?"
        message={`Staff already assigned to "${confirmDeleteDept?.name}" will keep the label until reassigned.`}
        confirmLabel="Delete"
      />

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={performClear}
        title="Clear all data?"
        message="This permanently deletes all staff, departments, and attendance records from this browser. This cannot be undone."
        confirmLabel="Clear everything"
      />

      <ConfirmDialog
        open={!!confirmImport}
        onClose={() => setConfirmImport(null)}
        onConfirm={performImport}
        title="Restore this backup?"
        message="This will overwrite all current staff, departments, and attendance data with the contents of the selected file."
        confirmLabel="Restore"
        danger={false}
      />

      <ConfirmDialog
        open={!!confirmDeleteType}
        onClose={() => setConfirmDeleteType(null)}
        onConfirm={handleConfirmDeleteType}
        title="Delete leave type?"
        message={`"${confirmDeleteType?.name}" will no longer appear as an option when requesting leave.`}
        confirmLabel="Delete"
      />

      <ConfirmDialog
        open={!!confirmDeleteReason}
        onClose={() => setConfirmDeleteReason(null)}
        onConfirm={handleConfirmDeleteReason}
        title="Delete leave reason?"
        message={`"${confirmDeleteReason?.name}" will no longer appear as an option when requesting leave.`}
        confirmLabel="Delete"
      />

      <ConfirmDialog
        open={!!confirmDeleteHoliday}
        onClose={() => setConfirmDeleteHoliday(null)}
        onConfirm={handleConfirmDeleteHoliday}
        title="Delete holiday?"
        message={`"${confirmDeleteHoliday?.name}" will be removed from the holiday calendar.`}
        confirmLabel="Delete"
      />

      <HolidayFormModal
        open={holidayModalOpen}
        onClose={() => { setHolidayModalOpen(false); setEditingHoliday(null); }}
        onSave={handleSaveHoliday}
        editing={editingHoliday}
      />
    </div>
  );
}
