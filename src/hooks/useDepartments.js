import { useState, useCallback, useEffect } from "react";
import * as departmentService from "../services/departmentService";

export function useDepartments() {
  const [departments, setDepartments] = useState(() => departmentService.getAllDepartments());

  const refresh = useCallback(() => setDepartments(departmentService.getAllDepartments()), []);

  useEffect(() => {
    let cancelled = false;
    departmentService.syncDepartments().then((list) => {
      if (!cancelled) setDepartments(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const add = useCallback(async (name) => {
    const record = await departmentService.addDepartment(name);
    refresh();
    return record;
  }, [refresh]);

  const update = useCallback(async (id, name) => {
    await departmentService.updateDepartment(id, name);
    refresh();
  }, [refresh]);

  const remove = useCallback(async (id) => {
    await departmentService.deleteDepartment(id);
    refresh();
  }, [refresh]);

  return { departments, add, update, remove, refresh };
}
