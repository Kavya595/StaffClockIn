import { MapPin, MapPinOff } from "lucide-react";
import { mapsLink, shortLocationLabel } from "../../utils/geo";

// Small inline pill — used in tables/lists where space is tight.
export function LocationBadge({ location, className = "" }) {
  if (!location) {
    return (
      <span className={`inline-flex items-center gap-1 text-[11px] text-ink-300 ${className}`}>
        <MapPinOff size={12} /> No location
      </span>
    );
  }
  const label = shortLocationLabel(location);
  const href = mapsLink(location);
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={location.address || label}
      className={`inline-flex items-center gap-1 text-[11px] font-medium text-sky hover:text-sky/80 hover:underline max-w-[160px] ${className}`}
    >
      <MapPin size={12} className="shrink-0" />
      <span className="truncate">{label}</span>
    </a>
  );
}

// Richer card used on dashboards — shows address, accuracy, and a map link.
export function LocationCard({ label, location, accentClass = "text-sky bg-sky-light" }) {
  return (
    <div className="rounded-card border border-ink-100 p-3.5">
      <p className="text-[11px] font-medium text-ink-400 mb-1.5">{label}</p>
      {location ? (
        <div className="flex items-start gap-2.5">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${accentClass}`}>
            <MapPin size={13} />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-ink leading-snug line-clamp-2">
              {location.address || `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`}
            </p>
            <a
              href={mapsLink(location)}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-medium text-sky hover:underline"
            >
              View on map ↗
            </a>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 text-ink-300">
          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-ink-50">
            <MapPinOff size={13} />
          </div>
          <p className="text-sm">Not captured</p>
        </div>
      )}
    </div>
  );
}

export default LocationBadge;
