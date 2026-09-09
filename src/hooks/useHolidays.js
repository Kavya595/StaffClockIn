import { useState, useCallback, useEffect } from "react";
import * as holidayService from "../services/holidayService";

export function useHolidays() {
  const [holidays, setHolidays] = useState(() => holidayService.getAllHolidays());

  const refresh = useCallback(() => setHolidays(holidayService.getAllHolidays()), []);

  useEffect(() => {
    let cancelled = false;
    holidayService.syncHolidays().then((list) => {
      if (!cancelled) setHolidays(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const add = useCallback(async (data) => {
    const r = await holidayService.addHoliday(data);
    refresh();
    return r;
  }, [refresh]);

  const update = useCallback(async (id, updates) => {
    await holidayService.updateHoliday(id, updates);
    refresh();
  }, [refresh]);

  const remove = useCallback(async (id) => {
    await holidayService.deleteHoliday(id);
    refresh();
  }, [refresh]);

  return { holidays, add, update, remove, refresh };
}
