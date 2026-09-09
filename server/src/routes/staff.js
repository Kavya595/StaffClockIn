import { Router } from "express";
import Staff from "../models/Staff.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

// Fields a staff member is never allowed to change about their own record,
// even via a PATCH that otherwise targets their own id — mirrors the old
// staff_guard() Postgres trigger.
const STAFF_LOCKED_FIELDS = [
  "id",
  "authUserId",
  "name",
  "role",
  "department",
  "joinDate",
  "status",
  "loginId",
  "avatarColor",
];

function leanToRecord(obj) {
  const { _id, __v, createdAt, updatedAt, ...rest } = obj;
  return { id: _id, ...rest };
}

router.get("/", requireAuth, async (req, res) => {
  if (req.user.role === "admin") {
    const docs = await Staff.find().sort({ createdAt: 1 }).lean();
    return res.json(docs.map(leanToRecord));
  }
  const own = await Staff.findById(req.user.staffId).lean();
  res.json(own ? [leanToRecord(own)] : []);
});

router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const record = req.body || {};
  if (!record.id) return res.status(400).json({ error: "Missing id." });
  const { id, ...rest } = record;
  const doc = await Staff.create({ _id: id, ...rest });
  res.json(leanToRecord(doc.toObject()));
});

router.patch("/:id", requireAuth, async (req, res) => {
  const isAdmin = req.user.role === "admin";
  const isSelf = req.user.staffId === req.params.id;
  if (!isAdmin && !isSelf) return res.status(403).json({ error: "Not allowed." });

  const patch = { ...req.body };
  delete patch.id;
  if (!isAdmin) {
    for (const field of STAFF_LOCKED_FIELDS) delete patch[field];
  }
  const doc = await Staff.findByIdAndUpdate(req.params.id, { $set: patch }, { new: true }).lean();
  if (!doc) return res.status(404).json({ error: "Not found." });
  res.json(leanToRecord(doc));
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  await Staff.deleteOne({ _id: req.params.id });
  res.json({ ok: true });
});

export default router;
