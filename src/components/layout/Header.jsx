import { useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { NAV_ITEMS } from "./navConfig";
import LiveClock from "../common/LiveClock";
import qwikIcon from "../../assets/brand/qwik-icon.png";

export default function Header() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-ink-100 relative">
      <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-brand" />
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        <button onClick={() => setOpen(true)} className="lg:hidden p-2 -ml-2 text-ink-500 active:bg-ink-100 rounded-full transition-colors">
          <Menu size={22} />
        </button>

        <div className="lg:hidden flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-white ring-1 ring-ink-100 shadow-brand-sm flex items-center justify-center p-1">
            <img src={qwikIcon} alt="" className="w-full h-full object-contain" />
          </div>
          <span className="font-display font-semibold text-sm text-gradient-brand">StaffClockIn</span>
        </div>

        <div className="hidden lg:block">
          <LiveClock />
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end leading-tight">
            <span className="text-sm font-medium text-ink">{user?.name}</span>
            <span className="text-[11px] text-ink-400 capitalize">{user?.role}</span>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-accent text-white flex items-center justify-center font-display font-semibold text-sm shadow-glow-sm">
            {user?.name?.[0]?.toUpperCase() || "A"}
          </div>
          <button onClick={logout} title="Log out" className="p-2 rounded-full text-ink-400 hover:text-rust hover:bg-rust-light/60">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/50" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-gradient-ink text-paper flex flex-col animate-fade-up">
            <div className="flex items-center justify-between px-5 h-16 border-b border-white/10">
              <span className="font-display font-semibold text-sm">StaffClockIn</span>
              <button onClick={() => setOpen(false)} className="text-ink-300"><X size={20} /></button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-card text-sm font-medium ${
                      isActive ? "bg-gradient-accent text-white" : "text-ink-200 hover:bg-white/5"
                    }`
                  }
                >
                  <Icon size={17} />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
