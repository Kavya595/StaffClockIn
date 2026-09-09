import { LayoutDashboard, Users, CalendarCheck, CalendarDays, FileBarChart, Radio, CalendarOff, CalendarHeart, Settings } from "lucide-react";

export const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/attendance", label: "Attendance", icon: CalendarCheck },
  { to: "/staff", label: "Staff", icon: Users },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/login-activity", label: "Login Activity", icon: Radio },
  { to: "/leaves", label: "Leave Requests", icon: CalendarOff },
  { to: "/holidays", label: "Holiday Calendar", icon: CalendarHeart },
  { to: "/reports", label: "Reports", icon: FileBarChart },
  { to: "/settings", label: "Settings", icon: Settings },
];

// Subset shown in the mobile bottom nav (keep to 5 for thumb reach)
const mobileTo = ["/", "/attendance", "/staff", "/login-activity", "/reports"];
export const MOBILE_NAV_ITEMS = mobileTo.map((to) => NAV_ITEMS.find((i) => i.to === to));
