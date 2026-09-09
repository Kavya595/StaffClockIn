import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import MobileNav from "./MobileNav";

export default function AppLayout() {
  return (
    <div className="min-h-screen flex bg-paper bg-gradient-mesh bg-fixed">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Header />
        <main className="flex-1 px-4 sm:px-6 py-6 pb-28 lg:pb-6 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
