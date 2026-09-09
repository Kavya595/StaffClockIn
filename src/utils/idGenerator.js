export function generateId(prefix = "id") {
  const rand = Math.random().toString(36).slice(2, 9);
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}
