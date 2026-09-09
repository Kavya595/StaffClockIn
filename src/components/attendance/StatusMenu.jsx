import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import Badge from "../common/Badge";

const OPTIONS = ["present", "leave", "late", "half_day"];

export default function StatusMenu({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 hover:opacity-80"
      >
        {value ? <Badge status={value} /> : <Badge>Not marked</Badge>}
        <ChevronDown size={13} className="text-ink-300" />
      </button>
      {open && (
        <div className="absolute z-20 right-0 mt-1.5 w-40 bg-white border border-ink-100 rounded-card shadow-panel py-1 animate-fade-up">
          {OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-ink-50 flex items-center gap-2"
            >
              <Badge status={opt} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
