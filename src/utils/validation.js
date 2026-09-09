export function isRequired(value) {
  return value !== undefined && value !== null && String(value).trim().length > 0;
}

export function isValidEmail(value) {
  if (!value) return true; // optional field
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isValidPhone(value) {
  if (!value) return true; // optional field
  return /^[0-9+\-()\s]{7,20}$/.test(value);
}

export function validateStaffForm(form, existingStaff = [], editingId = null) {
  const errors = {};
  if (!isRequired(form.name)) errors.name = "Name is required.";
  if (!isRequired(form.department)) errors.department = "Department is required.";
  if (!isRequired(form.role)) errors.role = "Role / title is required.";
  if (!isValidPhone(form.phone)) errors.phone = "Enter a valid phone number.";

  // Email doubles as the Staff Portal sign-in username (see staffService.addStaff),
  // so it's required, not optional — a staff record saved without one can never
  // actually get a working portal login.
  if (!isRequired(form.email)) {
    errors.email = "Email is required to create the staff member's portal login.";
  } else if (!isValidEmail(form.email)) {
    errors.email = "Enter a valid email address.";
  } else {
    const dup = existingStaff.find(
      (s) => s.email && s.email.toLowerCase() === form.email.toLowerCase() && s.id !== editingId
    );
    if (dup) errors.email = "This email is already used by another staff member.";
  }

  // Portal login (Staff ID + password) — required so the staff member
  // can actually sign in to /staff/login.
  if (!isRequired(form.loginId)) {
    errors.loginId = "Staff ID is required for portal login.";
  } else {
    const dupId = existingStaff.find(
      (s) => s.loginId && s.loginId.toLowerCase() === form.loginId.trim().toLowerCase() && s.id !== editingId
    );
    if (dupId) errors.loginId = "This Staff ID is already in use.";
  }

  const isNew = !editingId;
  if (isNew && !isRequired(form.password)) {
    errors.password = "Password is required for a new staff account.";
  }
  if (form.password || form.confirmPassword) {
    if (form.password && form.password.length < 6) {
      errors.password = "Password must be at least 6 characters.";
    } else if (form.password !== form.confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }
  }

  return errors;
}

export function validateDepartmentName(name, existing = [], editingId = null) {
  const errors = {};
  if (!isRequired(name)) {
    errors.name = "Department name is required.";
    return errors;
  }
  const dup = existing.find(
    (d) => d.name.toLowerCase() === name.trim().toLowerCase() && d.id !== editingId
  );
  if (dup) errors.name = "A department with this name already exists.";
  return errors;
}
