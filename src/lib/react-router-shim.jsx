/*
 * Minimal drop-in replacement for the handful of `react-router-dom` APIs the
 * legacy pages use (Link, NavLink, Navigate, Outlet, useLocation,
 * useNavigate, useParams). Vite aliases "react-router-dom" to this module so
 * the existing page/component code keeps working unchanged while TanStack
 * Router owns the actual app shell.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const RouterContext = createContext(null);
const OutletContext = createContext(null);
const ParamsContext = createContext({});

function readLocation() {
  if (typeof window === "undefined") return { pathname: "/", search: "", hash: "", state: null };
  return {
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
    state: window.history.state?.usr ?? null,
  };
}

export function LegacyRouterProvider({ children }) {
  const [location, setLocation] = useState(readLocation);

  useEffect(() => {
    const onPop = () => setLocation(readLocation());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((to, options = {}) => {
    if (typeof to === "number") {
      window.history.go(to);
      return;
    }
    const url = String(to);
    const entry = { usr: options.state ?? null };
    if (options.replace) window.history.replaceState(entry, "", url);
    else window.history.pushState(entry, "", url);
    setLocation(readLocation());
    window.scrollTo({ top: 0 });
  }, []);

  const value = useMemo(() => ({ location, navigate }), [location, navigate]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

function useRouterCtx() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("Router hooks must be used inside LegacyRouterProvider");
  return ctx;
}

export function useLocation() {
  return useRouterCtx().location;
}

export function useNavigate() {
  return useRouterCtx().navigate;
}

export function useParams() {
  return useContext(ParamsContext);
}

export function ParamsProvider({ params, children }) {
  return <ParamsContext.Provider value={params}>{children}</ParamsContext.Provider>;
}

export function OutletProvider({ element, children }) {
  return <OutletContext.Provider value={element}>{children}</OutletContext.Provider>;
}

export function Outlet() {
  return useContext(OutletContext);
}

export function Navigate({ to, replace = false, state = null }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(to, { replace, state });
  }, [navigate, to, replace, state]);
  return null;
}

export function Link({ to, state, replace, children, onClick, ...rest }) {
  const navigate = useNavigate();
  return (
    <a
      href={typeof to === "string" ? to : "#"}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to, { state, replace });
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

export function NavLink({ to, end = false, className, style, children, onClick, ...rest }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const target = String(to);
  const isActive = end
    ? pathname === target
    : pathname === target || pathname.startsWith(target.endsWith("/") ? target : `${target}/`);
  const state = { isActive, isPending: false, isTransitioning: false };

  return (
    <a
      href={target}
      aria-current={isActive ? "page" : undefined}
      className={typeof className === "function" ? className(state) : className}
      style={typeof style === "function" ? style(state) : style}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(target);
      }}
      {...rest}
    >
      {typeof children === "function" ? children(state) : children}
    </a>
  );
}
