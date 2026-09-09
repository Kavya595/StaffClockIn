import { createFileRoute } from "@tanstack/react-router";
import LegacyApp from "../LegacyApp";

export const Route = createFileRoute("/")({
  // The app is a session-driven admin/staff console rendered entirely on the
  // client (the signed-in JWT lives in browser storage).
  ssr: false,
  head: () => ({
    meta: [
      { title: "StaffClockIn — Attendance & Leave Console" },
      {
        name: "description",
        content:
          "Track staff attendance, clock-ins with location, leave requests and holidays in one console.",
      },
      { property: "og:title", content: "StaffClockIn — Attendance & Leave Console" },
      {
        property: "og:description",
        content:
          "Track staff attendance, clock-ins with location, leave requests and holidays in one console.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LegacyApp,
});
