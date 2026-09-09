// Centralized permission configuration. Every role check in the app
// (routes, navigation, buttons, actions) should go through
// hasPermission() rather than comparing user.role directly, so the
// rules only ever live in one place.

export const ROLES = {
  ADMIN: "admin",
  STAFF: "staff",
};

export const ROLE_PERMISSIONS = {
  admin: [
    "dashboard.view",
    "staff.manage",
    "departments.manage",
    "attendance.manage",
    "attendance.audit",
    "calendar.view",
    "reports.view",
    "settings.manage",
    "backup.manage",
    "leaves.manage",
  ],
  staff: [
    "staffDashboard.view",
    "attendance.view",
    "attendance.mark",
    "attendance.history",
    "reports.view.own",
    "profile.manage",
    "leaves.request",
  ],
};

export function hasPermission(user, permission) {
  if (!user || !user.role) return false;
  const granted = ROLE_PERMISSIONS[user.role];
  return Array.isArray(granted) && granted.includes(permission);
}
