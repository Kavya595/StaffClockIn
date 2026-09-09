import { useEffect, useState } from "react";
import Modal from "../common/Modal";
import Input from "../common/Input";
import Select from "../common/Select";
import Button from "../common/Button";
import { validateStaffForm } from "../../utils/validation";
import { suggestLoginId } from "../../services/staffService";

const EMPTY = {
  name: "",
  role: "",
  department: "",
  email: "",
  phone: "",
  joinDate: "",
  birthDate: "",
  loginId: "",
  status: "active",
  password: "",
  confirmPassword: "",
};

export default function StaffFormModal({ open, onClose, onSave, editing, departments, existingStaff }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({ ...EMPTY, ...editing, password: "", confirmPassword: "" });
      } else {
        setForm({ ...EMPTY, loginId: suggestLoginId() });
      }
      setErrors({});
    }
  }, [open, editing]);

  function handleChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const validation = validateStaffForm(form, existingStaff, editing?.id);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }
    const payload = { ...form };
    if (!payload.password) delete payload.password; // keep existing password on edit
    delete payload.confirmPassword;
    onSave(payload);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit staff member" : "Add staff member"}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="accent" type="submit" form="staff-form">{editing ? "Save changes" : "Add staff"}</Button>
        </>
      }
    >
      <form id="staff-form" onSubmit={handleSubmit} className="space-y-4">
        <Input label="Full name" name="name" value={form.name} onChange={(e) => handleChange("name", e.target.value)} error={errors.name} required />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Role / title" name="role" value={form.role} onChange={(e) => handleChange("role", e.target.value)} error={errors.role} required />
          <Select label="Department" name="department" value={form.department} onChange={(e) => handleChange("department", e.target.value)} error={errors.department} required>
            <option value="">Select...</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Email" name="email" type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} error={errors.email} hint="Used as the Staff Portal sign-in username." required />
          <Input label="Phone" name="phone" value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} error={errors.phone} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Join date" name="joinDate" type="date" value={form.joinDate} onChange={(e) => handleChange("joinDate", e.target.value)} />
          <Input label="Birth date (optional)" name="birthDate" type="date" value={form.birthDate} onChange={(e) => handleChange("birthDate", e.target.value)} hint="Used for birthday reminders" />
        </div>

        <div className="pt-2 border-t border-ink-100">
          <p className="text-xs font-medium text-ink-500 mb-3 pt-3">Staff Portal access</p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Staff ID (login)"
              name="loginId"
              value={form.loginId}
              onChange={(e) => handleChange("loginId", e.target.value)}
              error={errors.loginId}
              required
            />
            <Select label="Status" name="status" value={form.status} onChange={(e) => handleChange("status", e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Input
              label={editing ? "New password (optional)" : "Password"}
              name="password"
              type="password"
              value={form.password}
              onChange={(e) => handleChange("password", e.target.value)}
              error={errors.password}
              hint={editing ? "Leave blank to keep the current password." : undefined}
              required={!editing}
            />
            <Input
              label="Confirm password"
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => handleChange("confirmPassword", e.target.value)}
              error={errors.confirmPassword}
              required={!editing}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
