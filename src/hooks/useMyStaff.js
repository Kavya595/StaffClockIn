import { useState, useCallback, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import * as staffService from "../services/staffService";

// Loads and updates the logged-in Staff member's own record. Writes are
// routed through updateStaffSelf / changeStaffPassword so a Staff
// session can only ever touch its own permitted fields.
export function useMyStaff() {
  const { user } = useAuth();
  const [staff, setStaff] = useState(() => (user ? staffService.getStaffById(user.id) : null));

  const refresh = useCallback(() => {
    if (user) setStaff(staffService.getStaffById(user.id));
  }, [user]);

  // Pull the shared staff directory from Sheets (when configured) so this
  // member sees their own latest record even on a fresh device/session.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    staffService.syncStaff().then(() => {
      if (!cancelled) refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [user, refresh]);

  const updateSelf = useCallback(
    async (updates) => {
      if (!user) return null;
      const record = await staffService.updateStaffSelf(user.id, updates);
      refresh();
      return record;
    },
    [user, refresh]
  );

  const changePassword = useCallback(
    async (currentPassword, newPassword) => {
      if (!user) return { success: false, error: "Not signed in." };
      return staffService.changeStaffPassword(user.id, currentPassword, newPassword);
    },
    [user]
  );

  return { staff, refresh, updateSelf, changePassword };
}
