import { createContext, useState, useCallback } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

export const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, type = "success") => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => dismiss(id), 3200);
    },
    [dismiss]
  );

  const toast = {
    success: (msg) => push(msg, "success"),
    error: (msg) => push(msg, "error"),
    info: (msg) => push(msg, "info"),
  };

  const icons = { success: CheckCircle2, error: XCircle, info: Info };
  const styles = {
    success: "bg-ink text-paper border-moss/40",
    error: "bg-ink text-paper border-rust/50",
    info: "bg-ink text-paper border-brass/40",
  };
  const iconColor = { success: "text-moss", error: "text-rust", info: "text-brass" };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[min(360px,calc(100vw-2rem))]">
        {toasts.map((t) => {
          const Icon = icons[t.type];
          return (
            <div
              key={t.id}
              className={`flex items-start gap-2.5 rounded-card border px-4 py-3 shadow-panel animate-toast-in ${styles[t.type]}`}
              role="status"
            >
              <Icon size={18} className={`shrink-0 mt-0.5 ${iconColor[t.type]}`} />
              <p className="text-sm leading-snug font-body flex-1">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="text-ink-300 hover:text-paper shrink-0">
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
