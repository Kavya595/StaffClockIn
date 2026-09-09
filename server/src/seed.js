// Seeds reference data + demo staff/attendance so the app isn't empty on
// first run. Safe to re-run: every write is an upsert. Does NOT create any
// login accounts — use the app's "Set up administrator account" screen (or
// POST /api/auth/bootstrap-admin) for that.
import "dotenv/config";
import { connectDB } from "./db.js";
import Staff from "./models/Staff.js";
import Attendance from "./models/Attendance.js";
import { Department, LeaveType, LeaveReason, Holiday } from "./models/misc.js";

const departments = [
  { _id: "dep_seed1", name: "Operations" },
  { _id: "dep_seed2", name: "Retail" },
  { _id: "dep_seed3", name: "Logistics" },
  { _id: "dep_seed4", name: "IT Team" },
  { _id: "dep_seed5", name: "Editing Team" },
];

const leaveTypes = [
  { _id: "lvt_seed1", name: "Casual Leave", color: "moss", paid: true },
  { _id: "lvt_seed2", name: "Sick Leave", color: "rust", paid: true },
  { _id: "lvt_seed3", name: "Earned Leave", color: "honey", paid: true },
  { _id: "lvt_seed4", name: "Unpaid Leave", color: "ink", paid: false },
];

const leaveReasons = [
  { _id: "lvr_seed1", name: "Family event" },
  { _id: "lvr_seed2", name: "Medical appointment" },
  { _id: "lvr_seed3", name: "Personal work" },
  { _id: "lvr_seed4", name: "Travel" },
  { _id: "lvr_seed5", name: "Other" },
];

const holidays = [
  { _id: "hol_seed1", name: "New Year's Day", description: "", type: "public", date: "2026-01-01", recurring: true },
  {
    _id: "hol_seed2",
    name: "Independence Day",
    description: "India's Independence Day",
    type: "public",
    date: "2026-08-15",
    recurring: true,
  },
  {
    _id: "hol_seed3",
    name: "Founders' Day",
    description: "Company anniversary",
    type: "company",
    date: "2026-03-10",
    recurring: true,
  },
];

const staff = [
  {
    _id: "stf_seed1",
    name: "Amara Whitfield",
    role: "Floor Supervisor",
    department: "Operations",
    email: "amara.whitfield@example.com",
    phone: "555-0142",
    joinDate: "2023-02-14",
    status: "active",
    avatarColor: "#120D9E",
    loginId: "STF001",
  },
  {
    _id: "stf_seed2",
    name: "Devon Okafor",
    role: "Cashier",
    department: "Retail",
    email: "devon.okafor@example.com",
    phone: "555-0198",
    joinDate: "2023-06-01",
    status: "active",
    avatarColor: "#13A870",
    loginId: "STF002",
  },
  {
    _id: "stf_seed3",
    name: "Priya Nair",
    role: "Warehouse Lead",
    department: "Logistics",
    email: "priya.nair@example.com",
    phone: "555-0110",
    joinDate: "2022-11-20",
    status: "active",
    avatarColor: "#E14868",
    loginId: "STF003",
  },
  {
    _id: "stf_seed4",
    name: "Marcus Lee",
    role: "Barista",
    department: "Retail",
    email: "marcus.lee@example.com",
    phone: "555-0176",
    joinDate: "2024-01-09",
    status: "inactive",
    avatarColor: "#7B7FA0",
    loginId: "STF004",
  },
];

async function upsertAll(Model, docs) {
  await Promise.all(docs.map((d) => Model.findByIdAndUpdate(d._id, { $set: d }, { upsert: true })));
}

async function seedAttendance() {
  const active = staff.filter((s) => s.status === "active");
  const rows = [];
  for (const s of active) {
    for (let i = 1; i <= 15; i++) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      if (day.getDay() === 0 || day.getDay() === 6) continue; // skip weekends
      const dateStr = day.toISOString().slice(0, 10);
      const late = ((day.getDate() * 7 + s._id.length) % 28) - 4;
      const extra = ((day.getDate() * 5) % 40) - 10;
      rows.push({
        _id: `att_seed_${s._id}_${dateStr.replace(/-/g, "")}`,
        staffId: s._id,
        date: dateStr,
        clockIn: `${dateStr}T09:${String(30 + Math.max(late, 0)).padStart(2, "0")}:00.000Z`,
        clockOut: `${dateStr}T18:${String(Math.max(extra, 0)).padStart(2, "0")}:00.000Z`,
        status: late > 15 ? "late" : "present",
        loginStatus: late > 15 ? "late" : "on_time",
        lateMinutes: Math.max(late - 15, 0),
        logoutStatus: extra < 0 ? "early" : "normal",
        earlyMinutes: Math.max(-extra, 0),
        requiredMinutes: 510,
        workedMinutes: 510 + extra - late,
        workingHoursDiff: extra - late,
        note: "",
        markedBy: { id: "seed", name: "System seed", role: "admin" },
      });
    }
  }
  await upsertAll(Attendance, rows);
}

async function main() {
  await connectDB();
  await upsertAll(Department, departments);
  await upsertAll(LeaveType, leaveTypes);
  await upsertAll(LeaveReason, leaveReasons);
  await upsertAll(Holiday, holidays);
  await upsertAll(Staff, staff);
  await seedAttendance();
  console.log("[seed] done");
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
