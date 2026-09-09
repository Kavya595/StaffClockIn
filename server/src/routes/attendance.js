import { Router } from "express";
import Attendance from "../models/Attendance.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

function leanToRecord(obj) {
  const { _id, __v, createdAt, updatedAt, ...rest } = obj;
  return { id: _id, ...rest };
}

function toDoc(record) {
  const { id, ...rest } = record;
  return rest;
}

function scope(req) {
  return req.user.role === "admin" ? {} : { staffId: req.user.staffId };
}

router.get("/", requireAuth, async (req, res) => {
  const docs = await Attendance.find(scope(req)).sort({ date: -1 }).lean();
  res.json(docs.map(leanToRecord));
});

// Replace-the-whole-collection semantics. Admins replace everything; a
// staff caller's list can only ever affect their own rows (their local
// cache only ever held their own rows to begin with — see dbSync.js).
router.put("/", requireAuth, async (req, res) => {
  const records = Array.isArray(req.body?.records) ? req.body.records : [];
  const isAdmin = req.user.role === "admin";
  const own = isAdmin ? records : records.filter((r) => r.staffId === req.user.staffId);
  const ids = own.map((r) => r.id).filter(Boolean);

  await Promise.all(
    own
      .filter((r) => r.id)
      .map((r) =>
        Attendance.findByIdAndUpdate(r.id, { $set: toDoc(r) }, { upsert: true, new: true, setDefaultsOnInsert: true }),
      ),
  );
  await Attendance.deleteMany({ ...scope(req), _id: { $nin: ids } });
  res.json({ ok: true });
});

router.post("/", requireAuth, async (req, res) => {
  const record = req.body || {};
  if (!record.id) return res.status(400).json({ error: "Missing id." });
  if (req.user.role !== "admin" && record.staffId !== req.user.staffId) {
    return res.status(403).json({ error: "Not allowed." });
  }
  const { id, ...rest } = record;
  const doc = await Attendance.create({ _id: id, ...rest });
  res.json(leanToRecord(doc.toObject()));
});

router.patch("/:id", requireAuth, async (req, res) => {
  const existing = await Attendance.findById(req.params.id).lean();
  if (!existing) return res.status(404).json({ error: "Not found." });
  if (req.user.role !== "admin" && existing.staffId !== req.user.staffId) {
    return res.status(403).json({ error: "Not allowed." });
  }
  const patch = { ...req.body };
  delete patch.id;
  const doc = await Attendance.findByIdAndUpdate(req.params.id, { $set: patch }, { new: true }).lean();
  res.json(leanToRecord(doc));
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  await Attendance.deleteOne({ _id: req.params.id });
  res.json({ ok: true });
});

export default router;
