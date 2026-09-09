import { NavLink } from "react-router-dom";
import { MOBILE_NAV_ITEMS } from "./navConfig";

export default function MobileNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 pb-[max(env(safe-area-inset-bottom),0.5rem)] px-3 pt-1.5">
      <div className="relative flex items-stretch justify-between gap-0.5 rounded-[26px] bg-gradient-royal shadow-lift ring-1 ring-white/10 px-1 py-1.5 backdrop-blur">
        <span className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        {MOBILE_NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className="relative flex-1 flex flex-col items-center justify-center gap-1 py-1.5 rounded-2xl text-[9.5px] font-medium transition-all min-h-[44px]"
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-flame shadow-flame-sm scale-105 text-white"
                      : "text-ink-300 active:scale-95 active:bg-white/10"
                  }`}
                >
                  <Icon size={16} strokeWidth={isActive ? 2.4 : 2} />
                </span>
                <span
                  className={`truncate max-w-[52px] transition-colors ${
                    isActive ? "text-white font-semibold" : "text-ink-400"
                  }`}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
