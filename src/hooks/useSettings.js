import { useState, useCallback, useEffect } from "react";
import * as settingsService from "../services/settingsService";

export function useSettings() {
  const [settings, setSettings] = useState(() => settingsService.getSettings());

  useEffect(() => {
    let cancelled = false;
    settingsService.syncSettings().then((next) => {
      if (!cancelled) setSettings(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(async (updates) => {
    const next = await settingsService.saveSettings(updates);
    setSettings(next);
    return next;
  }, []);

  return { settings, save };
}
