import { LayoutDashboard, CalendarCheck, History, CalendarOff, CalendarHeart, FileBarChart, UserCircle } from "lucide-react";

export const STAFF_NAV_ITEMS = [
  { to: "/staff/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/staff/attendance", label: "Attendance", icon: CalendarCheck },
  { to: "/staff/history", label: "Working days", icon: History },
  { to: "/staff/leaves", label: "Leave", icon: CalendarOff },
  { to: "/staff/holidays", label: "Holidays", icon: CalendarHeart },
  { to: "/staff/reports", label: "Reports", icon: FileBarChart },
  { to: "/staff/profile", label: "Profile", icon: UserCircle },
];

// Shown in the mobile bottom nav (keep to 5 for thumb reach).
const mobileTo = ["/staff/dashboard", "/staff/attendance", "/staff/history", "/staff/leaves", "/staff/profile"];
export const STAFF_MOBILE_NAV_ITEMS = mobileTo.map((to) => STAFF_NAV_ITEMS.find((i) => i.to === to));
