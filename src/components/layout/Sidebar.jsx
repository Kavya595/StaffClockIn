import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "./navConfig";
import qwikIcon from "../../assets/brand/qwik-icon.png";

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 h-screen sticky top-0 bg-gradient-ink text-paper">
      <div className="flex items-center gap-3 px-6 h-16 border-b border-white/10">
        <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-glow-sm p-1">
          <img src={qwikIcon} alt="" className="w-full h-full object-contain" />
        </div>
        <div className="leading-tight">
          <p className="font-display font-semibold text-sm">Staff<span className="text-brass-300">ClockIn</span></p>
          <p className="text-[11px] text-ink-400">Admin console</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto scroll-thin">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-card text-sm font-medium transition-all ${
                isActive
                  ? "bg-gradient-accent text-white shadow-glow-sm"
                  : "text-ink-300 hover:bg-white/5 hover:text-paper"
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-white/10 text-[11px] text-ink-400 leading-relaxed space-y-1">
        <p>Data is saved securely in the cloud.</p>
        <p className="text-ink-500">Powered by Qwik Digital &amp; IT Solutions</p>
      </div>
    </aside>
  );
}
