import { Router } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Staff from "../models/Staff.js";
import { signToken } from "../utils/jwt.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

// Builds the same session shape the frontend has always consumed, whether
// the account is an admin or a staff portal login.
async function buildSession(user) {
  let staff = null;
  if (user.role === "staff" && user.staffId) {
    staff = await Staff.findById(user.staffId).lean();
  }
  return {
    id: user.role === "admin" ? String(user._id) : staff?._id || String(user._id),
    authUserId: String(user._id),
    username: user.email,
    email: user.email,
    staffId: staff?.loginId || null,
    name: staff?.name || user.name || user.email,
    role: user.role,
    department: staff?.department || null,
    loggedInAt: new Date().toISOString(),
  };
}

function tokenFor(user) {
  return signToken({
    userId: String(user._id),
    role: user.role,
    staffId: user.staffId || null,
    email: user.email,
  });
}

// ---- First-run setup ----

router.get("/admin-exists", async (_req, res) => {
  const count = await User.countDocuments({ role: "admin" });
  res.json({ exists: count > 0 });
});

router.post("/bootstrap-admin", async (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password || password.length < 8) {
    return res.status(400).json({ error: "Email and an 8+ character password are required." });
  }
  const existingAdmins = await User.countDocuments({ role: "admin" });
  if (existingAdmins > 0) {
    return res.status(409).json({ error: "An administrator account already exists." });
  }
  const normalizedEmail = email.trim().toLowerCase();
  const dup = await User.findOne({ email: normalizedEmail });
  if (dup) return res.status(409).json({ error: "That email is already in use." });

  const passwordHash = await bcrypt.hash(password, 10);
  await User.create({
    email: normalizedEmail,
    passwordHash,
    name: name || "Administrator",
    role: "admin",
  });
  res.json({ ok: true });
});

// ---- Sign in ----

async function signIn(req, res, requireRole) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Enter your email address and password." });
  }
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Incorrect email or password." });
  }
  if (user.role !== requireRole) {
    return res.status(403).json({
      error:
        requireRole === "admin"
          ? "This account isn't an administrator. Use the Staff Portal sign-in."
          : "This is an administrator account. Use the Admin Portal sign-in.",
    });
  }
  let staff = null;
  if (user.role === "staff") {
    staff = user.staffId ? await Staff.findById(user.staffId).lean() : null;
    if (staff?.status && staff.status !== "active") {
      return res.status(403).json({ error: "Your account has been deactivated. Please contact the administrator." });
    }
  }
  const session = await buildSession(user);
  res.json({ token: tokenFor(user), user: session });
}

router.post("/login", (req, res) => signIn(req, res, "admin"));
router.post("/staff-login", (req, res) => signIn(req, res, "staff"));

// ---- Current session ----

router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) return res.status(401).json({ error: "Account no longer exists." });
  res.json({ user: await buildSession(user) });
});

router.post("/logout", requireAuth, (_req, res) => {
  // Stateless JWTs — the client just discards the token. Nothing to do here.
  res.json({ ok: true });
});

router.post("/change-password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters." });
  }
  const user = await User.findById(req.user.userId);
  if (!user || !(await bcrypt.compare(currentPassword || "", user.passwordHash))) {
    return res.status(401).json({ error: "Current password is incorrect." });
  }
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.json({ ok: true });
});

// ---- Staff portal-account management (admin only) ----
// Mirrors what the old Supabase auth-admin server functions did: create /
// reset / remove the login account tied to a Staff directory row.

router.post("/staff-accounts", requireAuth, requireAdmin, async (req, res) => {
  const { staffId, email, password, name } = req.body || {};
  if (!staffId || !email || !password || password.length < 6) {
    return res.status(400).json({ error: "staffId, email and a 6+ character password are required." });
  }
  const staff = await Staff.findById(staffId);
  if (!staff) return res.status(404).json({ error: "Staff record not found." });

  const normalizedEmail = email.trim().toLowerCase();
  const dup = await User.findOne({ email: normalizedEmail });
  if (dup) return res.status(409).json({ error: "That email is already in use by another account." });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    email: normalizedEmail,
    passwordHash,
    name: name || staff.name,
    role: "staff",
    staffId: staff._id,
  });
  staff.authUserId = String(user._id);
  staff.email = normalizedEmail;
  await staff.save();
  res.json({ authUserId: String(user._id) });
});

router.put("/staff-accounts/:staffId/password", requireAuth, requireAdmin, async (req, res) => {
  const { password } = req.body || {};
  if (!password || password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }
  const staff = await Staff.findById(req.params.staffId).lean();
  if (!staff?.authUserId) {
    return res.status(404).json({ error: "This staff member has no portal account yet." });
  }
  const user = await User.findById(staff.authUserId);
  if (!user) return res.status(404).json({ error: "This staff member has no portal account yet." });
  user.passwordHash = await bcrypt.hash(password, 10);
  await user.save();
  res.json({ ok: true });
});

router.delete("/staff-accounts/:staffId", requireAuth, requireAdmin, async (req, res) => {
  const staff = await Staff.findById(req.params.staffId).lean();
  if (staff?.authUserId) {
    await User.deleteOne({ _id: staff.authUserId });
  }
  res.json({ ok: true });
});

export default router;
