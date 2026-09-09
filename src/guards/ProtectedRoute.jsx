import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Guards the Admin section of the app. A Staff session is authenticated
// but does not carry admin privileges, so it gets redirected to the
// Staff dashboard rather than treated as logged out.
export default function ProtectedRoute() {
  const { isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (!isAdmin) {
    return <Navigate to="/staff/dashboard" replace />;
  }
  return <Outlet />;
}
