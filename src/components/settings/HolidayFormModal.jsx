import { useEffect, useState } from "react";
import Modal from "../common/Modal";
import Input from "../common/Input";
import Select from "../common/Select";
import Button from "../common/Button";
import { HOLIDAY_TYPE_LABELS } from "../../constants/storageKeys";

const EMPTY = { name: "", description: "", type: "public", date: "", recurring: false };

export default function HolidayFormModal({ open, onClose, onSave, editing }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(editing ? { ...EMPTY, ...editing } : EMPTY);
      setError("");
    }
  }, [open, editing]);

  function handleChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Holiday name is required.");
      return;
    }
    if (!form.date) {
      setError("Pick a date.");
      return;
    }
    onSave({ ...form, name: form.name.trim() });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit holiday" : "Add holiday"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="accent" type="submit" form="holiday-form">{editing ? "Save changes" : "Add holiday"}</Button>
        </>
      }
    >
      <form id="holiday-form" onSubmit={handleSubmit} className="space-y-4">
        <Input label="Holiday name" value={form.name} onChange={(e) => handleChange("name", e.target.value)} error={error} required />
        <Input label="Description (optional)" value={form.description} onChange={(e) => handleChange("description", e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Type" value={form.type} onChange={(e) => handleChange("type", e.target.value)}>
            {Object.entries(HOLIDAY_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
          <Input label="Date" type="date" value={form.date} onChange={(e) => handleChange("date", e.target.value)} required />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-500 cursor-pointer">
          <input
            type="checkbox"
            checked={form.recurring}
            onChange={(e) => handleChange("recurring", e.target.checked)}
            className="rounded border-ink-300 text-brass focus:ring-brass/40"
          />
          Repeats every year on this month &amp; day
        </label>
      </form>
    </Modal>
  );
}
