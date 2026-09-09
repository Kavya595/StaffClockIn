import { Router } from "express";
import Leave from "../models/Leave.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

// Fields only an admin may set — mirrors the old leaves_guard() trigger.
const LOCKED_FIELDS = ["id", "staffId", "decidedAt", "decidedBy", "adminNote"];

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
  const docs = await Leave.find(scope(req)).sort({ fromDate: -1 }).lean();
  res.json(docs.map(leanToRecord));
});

router.put("/", requireAuth, async (req, res) => {
  const records = Array.isArray(req.body?.records) ? req.body.records : [];
  const isAdmin = req.user.role === "admin";
  const own = isAdmin ? records : records.filter((r) => r.staffId === req.user.staffId);
  const ids = own.map((r) => r.id).filter(Boolean);

  await Promise.all(
    own
      .filter((r) => r.id)
      .map((r) =>
        Leave.findByIdAndUpdate(r.id, { $set: toDoc(r) }, { upsert: true, new: true, setDefaultsOnInsert: true }),
      ),
  );
  await Leave.deleteMany({ ...scope(req), _id: { $nin: ids } });
  res.json({ ok: true });
});

router.post("/", requireAuth, async (req, res) => {
  const record = req.body || {};
  if (!record.id) return res.status(400).json({ error: "Missing id." });
  if (req.user.role !== "admin" && record.staffId !== req.user.staffId) {
    return res.status(403).json({ error: "Not allowed." });
  }
  const { id, ...rest } = record;
  const doc = await Leave.create({ _id: id, ...rest });
  res.json(leanToRecord(doc.toObject()));
});

router.patch("/:id", requireAuth, async (req, res) => {
  const existing = await Leave.findById(req.params.id).lean();
  if (!existing) return res.status(404).json({ error: "Not found." });
  const isAdmin = req.user.role === "admin";
  if (!isAdmin && existing.staffId !== req.user.staffId) {
    return res.status(403).json({ error: "Not allowed." });
  }
  const patch = { ...req.body };
  if (!isAdmin) {
    for (const field of LOCKED_FIELDS) delete patch[field];
    // A staff member may only withdraw their own still-pending request.
    const onlyStatus = Object.keys(patch).every((k) => k === "status");
    const validCancel = existing.status === "pending" && patch.status === "cancelled";
    if (!onlyStatus || !validCancel) {
      return res.status(403).json({ error: "You can only cancel a pending request." });
    }
  }
  delete patch.id;
  const doc = await Leave.findByIdAndUpdate(req.params.id, { $set: patch }, { new: true }).lean();
  res.json(leanToRecord(doc));
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  await Leave.deleteOne({ _id: req.params.id });
  res.json({ ok: true });
});

export default router;
