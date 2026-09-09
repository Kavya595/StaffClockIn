import { Search, X } from "lucide-react";

export default function SearchInput({ value, onChange, placeholder = "Search..." }) {
  return (
    <div className="relative w-full sm:w-64">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-card border border-ink-200 bg-white pl-9 pr-8 py-2.5 text-sm placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-brass/30 focus:border-brass"
      />
      {value && (
        <button onClick={() => onChange("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-500">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
