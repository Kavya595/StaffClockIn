import { useState, useCallback, useEffect } from "react";
import * as staffService from "../services/staffService";

export function useStaff() {
  const [staff, setStaff] = useState(() => staffService.getAllStaff());

  const refresh = useCallback(() => setStaff(staffService.getAllStaff()), []);

  // Pull the latest shared staff directory from the Sheets backend (when
  // configured) once on mount, then keep serving the (now up to date)
  // local cache synchronously for every render after that.
  useEffect(() => {
    let cancelled = false;
    staffService.syncStaff().then((list) => {
      if (!cancelled) setStaff(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const add = useCallback(async (data) => {
    const record = await staffService.addStaff(data);
    refresh();
    return record;
  }, [refresh]);

  const update = useCallback(async (id, updates) => {
    const record = await staffService.updateStaff(id, updates);
    refresh();
    return record;
  }, [refresh]);

  const remove = useCallback(async (id) => {
    await staffService.deleteStaff(id);
    refresh();
  }, [refresh]);

  return { staff, add, update, remove, refresh };
}
