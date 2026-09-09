import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Guards the Staff portal. An Admin session is authenticated but isn't
// a Staff account, so it's sent back to the Admin dashboard rather than
// silently rendering the Staff experience for them.
export default function StaffProtectedRoute() {
  const { isAuthenticated, isStaff } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/staff/login" replace state={{ from: location.pathname }} />;
  }
  if (!isStaff) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
