// First-run setup: creates the very first administrator account against the
// MongoDB/Express backend. The backend only allows this while no admin
// account exists yet — see server/src/routes/auth.js. Kept as thin wrappers
// with the same `fn() => Promise` / `fn({ data }) => Promise` shapes the old
// TanStack server functions had, so callers (Login.jsx) didn't need to change.
import { apiFetch } from "./apiClient";

export async function adminExists() {
  return apiFetch("/auth/admin-exists", { auth: false });
}

export async function bootstrapAdmin({
  data,
}: {
  data: { email: string; password: string; name?: string };
}) {
  return apiFetch("/auth/bootstrap-admin", { method: "POST", body: data, auth: false });
}
