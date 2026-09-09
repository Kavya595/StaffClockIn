import { Router } from "express";
import { LoginEvent } from "../models/misc.js";
import { optionalAuth, requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

function leanToRecord(obj) {
  const { _id, __v, createdAt, updatedAt, ...rest } = obj;
  return { id: _id, ...rest };
}

// The actor id a session's login events are stamped with: the staff's
// directory id for a staff account, the Mongo user id for an admin.
function actorId(user) {
  return user.role === "staff" ? user.staffId : user.userId;
}

router.get("/", requireAuth, async (req, res) => {
  const filter = req.user.role === "admin" ? {} : { userId: actorId(req.user) };
  const docs = await LoginEvent.find(filter).sort({ at: -1 }).lean();
  res.json(docs.map(leanToRecord));
});

// Append-only audit trail — no bulk replace/delete endpoint. Insert is
// allowed for any signed-in user (recording their own login/logout), and
// also anonymously for a failed_login attempt (there's no token yet at
// that point, same as the old "anon insert failed_login" RLS policy).
router.post("/", optionalAuth, async (req, res) => {
  const record = req.body || {};
  if (!record.id) return res.status(400).json({ error: "Missing id." });
  if (!req.user && record.type !== "failed_login") {
    return res.status(401).json({ error: "Sign in required." });
  }
  const { id, ...rest } = record;
  const doc = await LoginEvent.create({ _id: id, ...rest });
  res.json(leanToRecord(doc.toObject()));
});

router.patch("/:id", requireAuth, async (req, res) => {
  const existing = await LoginEvent.findById(req.params.id).lean();
  if (!existing) return res.status(404).json({ error: "Not found." });
  if (req.user.role !== "admin" && existing.userId !== actorId(req.user)) {
    return res.status(403).json({ error: "Not allowed." });
  }
  const patch = { ...req.body };
  delete patch.id;
  const doc = await LoginEvent.findByIdAndUpdate(req.params.id, { $set: patch }, { new: true }).lean();
  res.json(leanToRecord(doc));
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  await LoginEvent.deleteOne({ _id: req.params.id });
  res.json({ ok: true });
});

export default router;
