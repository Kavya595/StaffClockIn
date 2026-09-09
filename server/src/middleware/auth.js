import { verifyToken } from "../utils/jwt.js";

function extractToken(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
}

// Populates req.user when a valid token is present; never rejects the
// request. Used by routes that behave differently for signed-in vs.
// anonymous callers (e.g. recording a failed-login audit event).
export function optionalAuth(req, _res, next) {
  const token = extractToken(req);
  if (token) {
    try {
      req.user = verifyToken(token);
    } catch {
      req.user = null;
    }
  }
  next();
}

// Rejects the request unless it carries a valid bearer token.
export function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: "Missing bearer token." });
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

// Must run after requireAuth.
export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Administrator access required." });
  }
  next();
}
