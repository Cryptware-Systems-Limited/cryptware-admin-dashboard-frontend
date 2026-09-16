import { Outlet } from "react-router-dom";
import Sidebar from "@/components/navigation/Sidebar";
import Topbar from "@/components/navigation/Topbar";
import { useEffect, useState } from "react";
import { useEnv } from "@/context/EnvContext";
import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import { XMarkIcon } from "@heroicons/react/24/outline";

export default function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showProdBanner, setShowProdBanner] = useState(true);
  const { isProd } = useEnv();

  useEffect(() => {
    if (!isProd) return;
    const timer = window.setTimeout(() => setShowProdBanner(false), 7_000);
    return () => window.clearTimeout(timer);
  }, [isProd]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-100 dark:bg-slate-950">
      {isProd && showProdBanner && (
        <div role="status" className="relative flex shrink-0 items-center justify-center gap-2 bg-red-600 px-10 py-1.5 text-xs font-semibold text-white">
          <ExclamationTriangleIcon className="h-3.5 w-3.5 shrink-0" />
          <span>PRODUCTION — You are viewing and modifying live data</span>
          <button
            type="button"
            onClick={() => setShowProdBanner(false)}
            aria-label="Dismiss production warning"
            className="absolute right-3 rounded p-0.5 text-white/80 transition hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar sidebarCollapsed={sidebarCollapsed} onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />
          <main className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
