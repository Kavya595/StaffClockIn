import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

// Factory for the small admin-managed reference collections: departments,
// holidays, leave types, leave reasons. Every signed-in user (admin or
// staff) can read them; only an admin can write.
export function refDataRouter(Model, sortSpec) {
  const router = Router();

  router.get("/", requireAuth, async (_req, res) => {
    const docs = await Model.find().sort(sortSpec).lean();
    res.json(docs.map(leanToRecord));
  });

  // Replace-the-whole-collection semantics (upsert everything sent, delete
  // whatever else exists) — used by the frontend's persistCollection().
  router.put("/", requireAuth, requireAdmin, async (req, res) => {
    const records = Array.isArray(req.body?.records) ? req.body.records : [];
    const ids = records.map((r) => r.id).filter(Boolean);
    if (records.length) {
      await Promise.all(
        records.map((r) =>
          Model.findByIdAndUpdate(r.id, { $set: toDoc(r) }, { upsert: true, new: true, setDefaultsOnInsert: true }),
        ),
      );
    }
    await Model.deleteMany({ _id: { $nin: ids } });
    res.json({ ok: true });
  });

  router.post("/", requireAuth, requireAdmin, async (req, res) => {
    const record = req.body || {};
    if (!record.id) return res.status(400).json({ error: "Missing id." });
    const doc = await Model.create({ _id: record.id, ...toDoc(record) });
    res.json(toRecord(doc));
  });

  router.patch("/:id", requireAuth, requireAdmin, async (req, res) => {
    const patch = { ...req.body };
    delete patch.id;
    const doc = await Model.findByIdAndUpdate(req.params.id, { $set: patch }, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found." });
    res.json(toRecord(doc));
  });

  router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
    await Model.deleteOne({ _id: req.params.id });
    res.json({ ok: true });
  });

  return router;
}

function toDoc(record) {
  const { id, ...rest } = record;
  return rest;
}

function toRecord(doc) {
  const obj = doc.toObject ? doc.toObject() : doc;
  return leanToRecord(obj);
}

function leanToRecord(obj) {
  const { _id, __v, createdAt, updatedAt, ...rest } = obj;
  return { id: _id, ...rest };
}
