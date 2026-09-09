// Real browser geolocation for staff clock in/out. Every record's
// clockInLocation / clockOutLocation shape looks like:
// { lat, lng, accuracy, address, capturedAt } — address may be null
// if reverse geocoding fails or is unavailable (offline, rate limited).

export function isGeoSupported() {
  return typeof navigator !== "undefined" && !!navigator.geolocation;
}

export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!isGeoSupported()) {
      reject(new Error("Geolocation is not supported on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        reject(mapGeoError(err));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0, ...options }
    );
  });
}

function mapGeoError(err) {
  const messages = {
    1: "Location access was denied. Enable location permission to record where you clocked in.",
    2: "Your location could not be determined. Try again in a moment.",
    3: "Location request timed out. Try again.",
  };
  return new Error(messages[err.code] || err.message || "Unable to get your location.");
}

// Free, key-less reverse geocoding via OpenStreetMap Nominatim. Best
// effort only — a failed lookup still returns coordinates, just with
// address: null, so clock in/out never blocks on this network call.
export async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=17&addressdetails=1`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.display_name || null;
  } catch {
    return null;
  }
}

// Captures a full location snapshot: coordinates + best-effort address.
export async function captureLocation() {
  const coords = await getCurrentPosition();
  const address = await reverseGeocode(coords.lat, coords.lng);
  return { ...coords, address, capturedAt: new Date().toISOString() };
}

export function mapsLink(location) {
  if (!location) return null;
  return `https://www.google.com/maps?q=${location.lat},${location.lng}`;
}

// Short label for a location — the address if we have one, otherwise
// coordinates truncated to something readable.
// Haversine distance in meters — used for a client-side geofence hint
// before the Clock In/Out request is even sent. The Apps Script backend
// re-checks this authoritatively; this is only a fast, friendly warning.
export function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function checkGeofence(location, settings) {
  const enabled = String(settings?.["Geofencing Enabled"]).toUpperCase() === "TRUE";
  if (!enabled || !location) return { ok: true };
  const officeLat = parseFloat(settings["Office Latitude"]);
  const officeLng = parseFloat(settings["Office Longitude"]);
  const radius = parseFloat(settings["Allowed Radius"]) || 200;
  if (Number.isNaN(officeLat) || Number.isNaN(officeLng)) return { ok: true };
  const distance = distanceMeters(location.lat, location.lng, officeLat, officeLng);
  if (distance <= radius) return { ok: true, distance };
  return {
    ok: false,
    distance,
    message: `You are approximately ${(distance / 1000).toFixed(2)} km from the office. Clock In/Out may be blocked.`,
  };
}

export function shortLocationLabel(location) {
  if (!location) return null;
  if (location.address) {
    const parts = location.address.split(",").map((p) => p.trim());
    return parts.slice(0, 3).join(", ");
  }
  return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
}
