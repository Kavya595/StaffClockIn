import { Outlet } from "react-router-dom";
import StaffSidebar from "./StaffSidebar";
import StaffHeader from "./StaffHeader";
import StaffMobileNav from "./StaffMobileNav";

export default function StaffLayout() {
  return (
    <div className="min-h-screen flex bg-paper bg-gradient-mesh bg-fixed">
      <StaffSidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <StaffHeader />
        <main className="flex-1 px-4 sm:px-6 py-6 pb-28 lg:pb-6 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
      <StaffMobileNav />
    </div>
  );
}
