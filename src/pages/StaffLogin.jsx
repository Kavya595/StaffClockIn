import { useState } from "react";
import { useNavigate, useLocation, Navigate, Link } from "react-router-dom";
import { Eye, EyeOff, LogIn, MapPin } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import qwikLogo from "../assets/brand/qwik-logo.png";

const REMEMBER_KEY = "attendance_tracker_staff_remember";

export default function StaffLogin() {
  const { loginStaff, isAuthenticated, isStaff } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({
    email: (typeof window !== "undefined" && localStorage.getItem(REMEMBER_KEY)) || "",
    password: "",
  });
  const [remember, setRemember] = useState(
    typeof window !== "undefined" && !!localStorage.getItem(REMEMBER_KEY)
  );
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={isStaff ? location.state?.from || "/staff/dashboard" : "/"} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const result = await loginStaff(form.email, form.password);
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    if (remember) localStorage.setItem(REMEMBER_KEY, form.email.trim());
    else localStorage.removeItem(REMEMBER_KEY);
    navigate(location.state?.from || "/staff/dashboard", { replace: true });
  }

  return (
    <div className="min-h-screen bg-gradient-ink bg-gradient-mesh flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-moss/15 blur-3xl animate-blob" />
      <div className="absolute -bottom-32 -right-20 w-96 h-96 rounded-full bg-brass/20 blur-3xl animate-blob" style={{ animationDelay: "3s" }} />

      <div className="relative w-full max-w-sm animate-fade-up">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-white rounded-2xl px-5 py-3 mb-5 shadow-lift">
            <img src={qwikLogo} alt="Qwik Digital and IT Solutions" className="h-11 w-auto" />
          </div>
          <h1 className="font-display font-extrabold text-white text-4xl sm:text-5xl tracking-tight animate-headline-pop drop-shadow-[0_2px_18px_rgba(253,108,0,0.35)]">
            Staff<span className="text-gradient-animated">ClockIn</span>
          </h1>
          <p className="text-ink-200 text-sm sm:text-base mt-2 flex items-center gap-1.5 font-medium">
            <MapPin size={14} className="text-moss" /> Clock in with your location
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-xl2 shadow-lift p-6 sm:p-7 space-y-4">
          <Input
            label="Work email"
            name="email"
            type="email"
            autoComplete="username"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="you@company.com"
            className="!bg-white/95"
            required
          />
          <div className="relative">
            <Input
              label="Password"
              name="password"
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="!bg-white/95"
              required
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-3 top-[34px] text-ink-300 hover:text-ink-500"
              tabIndex={-1}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <label className="flex items-center gap-2 text-xs text-ink-200 select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="rounded border-ink-200 text-brass focus:ring-brass/40"
            />
            Remember me
          </label>

          {error && (
            <p className="text-xs text-rust bg-rust-light rounded-card px-3 py-2">{error}</p>
          )}

          <Button type="submit" variant="accent" className="w-full" icon={LogIn} disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </Button>

          <p className="text-[11px] text-ink-300 text-center pt-1">
            Use the work email your administrator registered for you.
          </p>
        </form>

        <p className="text-center text-sm text-ink-300 mt-6">
          Administrator?{" "}
          <Link to="/login" className="text-brass-300 hover:text-brass-200 font-medium">
            Sign in to the Admin Portal
          </Link>
        </p>
      </div>
    </div>
  );
}
