import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useMyStaff } from "../../hooks/useMyStaff";
import Card from "../../components/common/Card";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import { useToast } from "../../hooks/useToast";
import { isValidEmail, isValidPhone } from "../../utils/validation";
import { formatDisplayDate } from "../../utils/dateUtils";

export default function StaffProfile() {
  const { user } = useAuth();
  const { staff, updateSelf, changePassword } = useMyStaff();
  const toast = useToast();

  const [contact, setContact] = useState({ email: "", phone: "" });
  const [contactErrors, setContactErrors] = useState({});

  useEffect(() => {
    if (staff) setContact({ email: staff.email || "", phone: staff.phone || "" });
  }, [staff]);

  async function handleContactSave(e) {
    e.preventDefault();
    const errors = {};
    if (!isValidEmail(contact.email)) errors.email = "Enter a valid email address.";
    if (!isValidPhone(contact.phone)) errors.phone = "Enter a valid phone number.";
    if (Object.keys(errors).length) {
      setContactErrors(errors);
      return;
    }
    setContactErrors({});
    try {
      await updateSelf(contact);
      toast.success("Profile updated.");
    } catch (err) {
      toast.error(err.message || "Could not update your profile.");
    }
  }

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState("");

  async function handlePasswordSave(e) {
    e.preventDefault();
    setPwError("");
    if (pw.next !== pw.confirm) {
      setPwError("New password and confirmation do not match.");
      return;
    }
    let result;
    try {
      result = await changePassword(pw.current, pw.next);
    } catch (err) {
      setPwError(err.message || "Could not change your password.");
      return;
    }
    if (!result.success) {
      setPwError(result.error);
      return;
    }
    setPw({ current: "", next: "", confirm: "" });
    toast.success("Password changed.");
  }

  if (!staff) return null;

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="font-display text-xl font-semibold text-ink">My profile</h1>
        <p className="text-sm text-ink-400">View your account and update your contact details</p>
      </div>

      <Card className="p-5 sm:p-6">
        <div className="flex items-center gap-4 mb-5">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-display font-semibold text-white shrink-0"
            style={{ backgroundColor: staff.avatarColor || "#120D9E" }}
          >
            {staff.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
          </div>
          <div>
            <p className="font-display font-semibold text-ink">{staff.name}</p>
            <p className="text-sm text-ink-400">{staff.role}</p>
          </div>
          <span
            className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              staff.status === "active" ? "bg-moss-light text-moss" : "bg-rust-light text-rust"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${staff.status === "active" ? "bg-moss" : "bg-rust"}`} />
            {staff.status === "active" ? "Active" : "Inactive"}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-[11px] text-ink-400 mb-0.5">Staff ID</dt>
            <dd className="text-ink font-mono">{user.staffId}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-ink-400 mb-0.5">Department</dt>
            <dd className="text-ink">{staff.department}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-ink-400 mb-0.5">Role / title</dt>
            <dd className="text-ink">{staff.role}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-ink-400 mb-0.5">Join date</dt>
            <dd className="text-ink">{staff.joinDate ? formatDisplayDate(staff.joinDate) : "—"}</dd>
          </div>
        </dl>
        <p className="text-[11px] text-ink-400 mt-4 leading-relaxed">
          Role, department, and account status are managed by your administrator.
        </p>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="font-display font-semibold text-sm text-ink mb-4">Contact details</h2>
        <form onSubmit={handleContactSave} className="space-y-4">
          <Input
            label="Email"
            name="email"
            type="email"
            value={contact.email}
            onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
            error={contactErrors.email}
          />
          <Input
            label="Phone"
            name="phone"
            value={contact.phone}
            onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
            error={contactErrors.phone}
          />
          <Button type="submit" variant="accent">Save contact details</Button>
        </form>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="font-display font-semibold text-sm text-ink mb-4">Change password</h2>
        <form onSubmit={handlePasswordSave} className="space-y-4">
          <Input
            label="Current password"
            type="password"
            value={pw.current}
            onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="New password"
              type="password"
              value={pw.next}
              onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
              required
            />
            <Input
              label="Confirm new password"
              type="password"
              value={pw.confirm}
              onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
              required
            />
          </div>
          {pwError && <p className="text-xs text-rust bg-rust-light rounded-card px-3 py-2">{pwError}</p>}
          <Button type="submit" variant="primary">Update password</Button>
        </form>
      </Card>
    </div>
  );
}
