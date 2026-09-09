export function initials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function pct(value, digits = 0) {
  if (value == null || Number.isNaN(value)) return "0%";
  return `${value.toFixed(digits)}%`;
}
