import { Router } from "express";
import { AppSetting } from "../models/misc.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();
const SETTINGS_KEY = "app";

router.get("/", requireAuth, async (_req, res) => {
  const doc = await AppSetting.findById(SETTINGS_KEY).lean();
  res.json({ value: doc?.value || {} });
});

router.put("/", requireAuth, requireAdmin, async (req, res) => {
  const value = req.body?.value || {};
  await AppSetting.findByIdAndUpdate(SETTINGS_KEY, { $set: { value } }, { upsert: true });
  res.json({ value });
});

export default router;
