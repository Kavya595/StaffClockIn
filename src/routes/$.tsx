import { createFileRoute } from "@tanstack/react-router";
import LegacyApp from "../LegacyApp";

// Catch-all: every in-app path (/attendance, /staff/:id, /staff/dashboard, ...)
// is handled by the client-side app shell.
export const Route = createFileRoute("/$")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "StaffClockIn — Attendance & Leave Console" },
      {
        name: "description",
        content: "Attendance, clock-in tracking, leave approvals and holidays for your team.",
      },
      { property: "og:title", content: "StaffClockIn" },
      {
        property: "og:description",
        content: "Attendance, clock-in tracking, leave approvals and holidays for your team.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LegacyApp,
});
