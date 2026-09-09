// Account provisioning for the staff directory, against the MongoDB/Express
// backend (see server/src/routes/auth.js). Kept as thin wrappers with the
// same `fn({ data }) => Promise` call shape the old TanStack server
// functions had, so callers (staffService.js) didn't need to change.
import { apiFetch } from "./apiClient";

export async function createStaffAccount({
  data,
}: {
  data: { staffId: string; email: string; password: string; name?: string };
}) {
  return apiFetch("/auth/staff-accounts", { method: "POST", body: data });
}

export async function setStaffPassword({
  data,
}: {
  data: { staffId: string; password: string };
}) {
  return apiFetch(`/auth/staff-accounts/${encodeURIComponent(data.staffId)}/password`, {
    method: "PUT",
    body: { password: data.password },
  });
}

export async function deleteStaffAccount({ data }: { data: { staffId: string } }) {
  return apiFetch(`/auth/staff-accounts/${encodeURIComponent(data.staffId)}`, { method: "DELETE" });
}
