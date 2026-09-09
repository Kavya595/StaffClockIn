import { STATUS_COLORS, STATUS_LABELS } from "../../constants/storageKeys";

export default function Badge({ status, children, className = "" }) {
  if (status) {
    const c = STATUS_COLORS[status] || { bg: "bg-ink-100", text: "text-ink-500", dot: "bg-ink-300" };
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${c.bg} ${c.text} ${className}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
        {STATUS_LABELS[status] || status}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-ink-100 text-ink-600 ${className}`}>
      {children}
    </span>
  );
}
