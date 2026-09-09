import { useState, useCallback, useEffect } from "react";
import { getData, setData } from "../services/storageService";

// Generic hook that keeps a React state value in sync with a LocalStorage key.
export function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => getData(key, defaultValue));

  useEffect(() => {
    setData(key, value);
  }, [key, value]);

  const update = useCallback((updater) => {
    setValue((prev) => (typeof updater === "function" ? updater(prev) : updater));
  }, []);

  return [value, update];
}
