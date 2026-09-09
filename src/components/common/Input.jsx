export default function Input({ label, error, hint, className = "", id, ...props }) {
  const inputId = id || props.name;
  return (
    <label className="block" htmlFor={inputId}>
      {label && <span className="block text-xs font-medium text-ink-500 mb-1.5">{label}</span>}
      <input
        id={inputId}
        className={`w-full rounded-card border bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-brass/30 transition-colors ${
          error ? "border-rust" : "border-ink-200 focus:border-brass"
        } ${className}`}
        {...props}
      />
      {error && <span className="block text-xs text-rust mt-1">{error}</span>}
      {!error && hint && <span className="block text-xs text-ink-300 mt-1">{hint}</span>}
    </label>
  );
}
