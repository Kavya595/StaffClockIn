import { ChevronDown } from "lucide-react";

export default function Select({ label, error, className = "", children, id, ...props }) {
  const selectId = id || props.name;
  return (
    <label className="block" htmlFor={selectId}>
      {label && <span className="block text-xs font-medium text-ink-500 mb-1.5">{label}</span>}
      <div className="relative">
        <select
          id={selectId}
          className={`w-full appearance-none rounded-card border bg-white px-3.5 py-2.5 pr-9 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brass/30 transition-colors ${
            error ? "border-rust" : "border-ink-200 focus:border-brass"
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-300" />
      </div>
      {error && <span className="block text-xs text-rust mt-1">{error}</span>}
    </label>
  );
}
