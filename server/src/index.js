import "dotenv/config";
import "express-async-errors";
import express from "express";
import cors from "cors";
import { connectDB } from "./db.js";

import authRoutes from "./routes/auth.js";
import staffRoutes from "./routes/staff.js";
import attendanceRoutes from "./routes/attendance.js";
import leavesRoutes from "./routes/leaves.js";
import loginEventsRoutes from "./routes/loginEvents.js";
import settingsRoutes from "./routes/settings.js";
import { refDataRouter } from "./routes/refData.js";
import { Department, LeaveType, LeaveReason, Holiday } from "./models/misc.js";

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
    credentials: true,
  }),
);
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leaves", leavesRoutes);
app.use("/api/login-events", loginEventsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/departments", refDataRouter(Department, { name: 1 }));
app.use("/api/leave-types", refDataRouter(LeaveType, { createdAt: 1 }));
app.use("/api/leave-reasons", refDataRouter(LeaveReason, { createdAt: 1 }));
app.use("/api/holidays", refDataRouter(Holiday, { date: 1 }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error." });
});

const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`[server] listening on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("[server] failed to start:", err.message);
    process.exit(1);
  });
