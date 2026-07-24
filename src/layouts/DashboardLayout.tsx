import { Outlet } from "react-router-dom";
import Sidebar from "@/components/navigation/Sidebar";
import Topbar from "@/components/navigation/Topbar";
import { useState } from "react";
import { useEnv } from "@/context/EnvContext";
import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";

export default function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isProd } = useEnv();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-slate-950">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div className="flex flex-col flex-1 overflow-hidden">
        {isProd && (
          <div className="flex items-center justify-center gap-2 px-4 py-1.5 bg-red-600 text-white text-xs font-semibold shrink-0">
            <ExclamationTriangleIcon className="w-3.5 h-3.5 shrink-0" />
            PRODUCTION — You are viewing and modifying live data
          </div>
        )}
        <Topbar sidebarCollapsed={sidebarCollapsed} onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
