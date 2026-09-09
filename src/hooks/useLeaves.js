import { useState, useCallback, useEffect } from "react";
import * as leaveService from "../services/leaveService";

export function useLeaves() {
  const [leaves, setLeaves] = useState(() => leaveService.getAllLeaves());

  const refresh = useCallback(() => setLeaves(leaveService.getAllLeaves()), []);

  useEffect(() => {
    let cancelled = false;
    leaveService.syncLeaves().then((list) => {
      if (!cancelled) setLeaves(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const requestLeave = useCallback(async (staffId, data) => {
    const r = await leaveService.requestLeave(staffId, data);
    refresh();
    return r;
  }, [refresh]);

  const approveLeave = useCallback(async (id, adminNote) => {
    const r = await leaveService.approveLeave(id, adminNote);
    refresh();
    return r;
  }, [refresh]);

  const rejectLeave = useCallback(async (id, adminNote) => {
    const r = await leaveService.rejectLeave(id, adminNote);
    refresh();
    return r;
  }, [refresh]);

  const cancelLeave = useCallback(async (id) => {
    await leaveService.cancelLeave(id);
    refresh();
  }, [refresh]);

  const removeLeave = useCallback(async (id) => {
    await leaveService.deleteLeave(id);
    refresh();
  }, [refresh]);

  return { leaves, requestLeave, approveLeave, rejectLeave, cancelLeave, removeLeave, refresh };
}
