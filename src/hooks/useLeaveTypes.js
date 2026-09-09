import { useState, useCallback, useEffect } from "react";
import * as leaveTypeService from "../services/leaveTypeService";

export function useLeaveTypes() {
  const [leaveTypes, setLeaveTypes] = useState(() => leaveTypeService.getAllLeaveTypes());
  const [leaveReasons, setLeaveReasons] = useState(() => leaveTypeService.getAllLeaveReasons());

  const refresh = useCallback(() => {
    setLeaveTypes(leaveTypeService.getAllLeaveTypes());
    setLeaveReasons(leaveTypeService.getAllLeaveReasons());
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([leaveTypeService.syncLeaveTypes(), leaveTypeService.syncLeaveReasons()]).then(
      ([types, reasons]) => {
        if (cancelled) return;
        setLeaveTypes(types);
        setLeaveReasons(reasons);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const addType = useCallback(async (data) => {
    const r = await leaveTypeService.addLeaveType(data);
    refresh();
    return r;
  }, [refresh]);

  const updateType = useCallback(async (id, updates) => {
    await leaveTypeService.updateLeaveType(id, updates);
    refresh();
  }, [refresh]);

  const removeType = useCallback(async (id) => {
    await leaveTypeService.deleteLeaveType(id);
    refresh();
  }, [refresh]);

  const addReason = useCallback(async (name) => {
    const r = await leaveTypeService.addLeaveReason(name);
    refresh();
    return r;
  }, [refresh]);

  const updateReason = useCallback(async (id, name) => {
    await leaveTypeService.updateLeaveReason(id, name);
    refresh();
  }, [refresh]);

  const removeReason = useCallback(async (id) => {
    await leaveTypeService.deleteLeaveReason(id);
    refresh();
  }, [refresh]);

  return {
    leaveTypes,
    leaveReasons,
    addType,
    updateType,
    removeType,
    addReason,
    updateReason,
    removeReason,
    refresh,
  };
}
