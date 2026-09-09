import { LegacyRouterProvider, OutletProvider, ParamsProvider, useLocation } from "./lib/react-router-shim";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import ProtectedRoute from "./guards/ProtectedRoute";
import StaffProtectedRoute from "./guards/StaffProtectedRoute";
import AppLayout from "./components/layout/AppLayout";
import StaffLayout from "./components/staffLayout/StaffLayout";
import Login from "./pages/Login";
import StaffLogin from "./pages/StaffLogin";
import Dashboard from "./pages/Dashboard";
import Attendance from "./pages/Attendance";
import Staff from "./pages/Staff";
import StaffDetail from "./pages/StaffDetail";
import CalendarPage from "./pages/CalendarPage";
import Reports from "./pages/Reports";
import LoginActivity from "./pages/LoginActivity";
import Leaves from "./pages/Leaves";
import HolidayCalendar from "./pages/HolidayCalendar";
import SettingsPage from "./pages/Settings";
import StaffDashboard from "./pages/staff/StaffDashboard";
import StaffAttendance from "./pages/staff/StaffAttendance";
import StaffHistory from "./pages/staff/StaffHistory";
import StaffLeaves from "./pages/staff/StaffLeaves";
import StaffReports from "./pages/staff/StaffReports";
import StaffProfile from "./pages/staff/StaffProfile";
import NotFound from "./pages/NotFound";

const ADMIN_ROUTES = {
  "/": <Dashboard />,
  "/attendance": <Attendance />,
  "/staff": <Staff />,
  "/calendar": <CalendarPage />,
  "/reports": <Reports />,
  "/login-activity": <LoginActivity />,
  "/leaves": <Leaves />,
  "/holidays": <HolidayCalendar />,
  "/settings": <SettingsPage />,
};

const STAFF_ROUTES = {
  "/staff/dashboard": <StaffDashboard />,
  "/staff/attendance": <StaffAttendance />,
  "/staff/history": <StaffHistory />,
  "/staff/leaves": <StaffLeaves />,
  "/staff/holidays": <HolidayCalendar />,
  "/staff/reports": <StaffReports />,
  "/staff/profile": <StaffProfile />,
};

// Wraps a page in its layout + guard chain, feeding each level's <Outlet />.
// nest(page, layout, guard) => guard renders layout renders page.
function nest(page, ...wrappers) {
  return wrappers.reduce(
    (child, wrapper) => <OutletProvider element={child}>{wrapper}</OutletProvider>,
    page
  );
}

function SessionSplash() {
  return (
    <div className="min-h-screen bg-gradient-ink bg-gradient-mesh flex items-center justify-center">
      <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-brass animate-spin" />
    </div>
  );
}

function Routed() {
  const { pathname } = useLocation();
  const { ready } = useAuth();
  const path = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

  // Wait for the stored session to be validated before any guard can decide
  // to redirect — otherwise a reload flashes the login screen.
  if (!ready) return <SessionSplash />;

  if (path === "/login") return <Login />;
  if (path === "/staff/login") return <StaffLogin />;

  if (STAFF_ROUTES[path]) {
    return nest(STAFF_ROUTES[path], <StaffLayout />, <StaffProtectedRoute />);
  }

  if (ADMIN_ROUTES[path]) {
    return nest(ADMIN_ROUTES[path], <AppLayout />, <ProtectedRoute />);
  }

  const staffDetail = path.match(/^\/staff\/([^/]+)$/);
  if (staffDetail) {
    return (
      <ParamsProvider params={{ id: decodeURIComponent(staffDetail[1]) }}>
        {nest(<StaffDetail />, <AppLayout />, <ProtectedRoute />)}
      </ParamsProvider>
    );
  }

  return <NotFound />;
}

export default function LegacyApp() {
  return (
    <ToastProvider>
      <AuthProvider>
        <LegacyRouterProvider>
          <Routed />
        </LegacyRouterProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
