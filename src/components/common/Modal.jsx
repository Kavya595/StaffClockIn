import { useEffect } from "react";
import { X } from "lucide-react";

export default function Modal({ open, onClose, title, children, footer, size = "md" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizes = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-xl", xl: "max-w-2xl" };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-ink-950/55 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        className={`relative w-full ${sizes[size]} bg-white rounded-t-card sm:rounded-xl2 shadow-lift max-h-[90vh] overflow-hidden flex flex-col animate-scale-in`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100 shrink-0">
          <h2 className="font-display font-semibold text-ink text-base">{title}</h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink p-1 rounded-full hover:bg-ink-50">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto scroll-thin">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-ink-100 flex justify-end gap-2 shrink-0">{footer}</div>}
      </div>
    </div>
  );
}
