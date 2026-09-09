import { useState, useCallback, useEffect } from "react";
import * as attendanceService from "../services/attendanceService";

export function useAttendance() {
  const [records, setRecords] = useState(() => attendanceService.getAllAttendance());

  const refresh = useCallback(() => setRecords(attendanceService.getAllAttendance()), []);

  // Pull the records this user is allowed to see from the database on mount,
  // so a fresh device/session sees the shared, persisted data.
  useEffect(() => {
    let cancelled = false;
    attendanceService.syncAttendance().then((list) => {
      if (!cancelled) setRecords(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const clockIn = useCallback(async (staffId, date, location) => {
    const r = await attendanceService.clockIn(staffId, date, location);
    refresh();
    return r;
  }, [refresh]);

  const clockOut = useCallback(async (staffId, date, location) => {
    const r = await attendanceService.clockOut(staffId, date, location);
    refresh();
    return r;
  }, [refresh]);

  const markStatus = useCallback((staffId, date, status, note) => {
    const r = attendanceService.markStatus(staffId, date, status, note);
    refresh();
    return r;
  }, [refresh]);

  const correctRecord = useCallback((staffId, date, updates) => {
    const r = attendanceService.correctRecord(staffId, date, updates);
    refresh();
    return r;
  }, [refresh]);

  const remove = useCallback((id) => {
    attendanceService.deleteRecord(id);
    refresh();
  }, [refresh]);

  return { records, clockIn, clockOut, markStatus, correctRecord, remove, refresh };
}
