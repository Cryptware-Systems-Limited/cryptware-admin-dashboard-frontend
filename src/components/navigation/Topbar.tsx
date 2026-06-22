import { BellIcon, MagnifyingGlassIcon, Bars3Icon } from "@heroicons/react/24/outline";
import { useLocation } from "react-router-dom";

const PAGE_TITLES: Record<string, string> = {
  "/overview": "Overview",
  "/reports": "Reports",
  "/clients": "Clients",
  "/geographic-coverage": "Geographic Coverage",
  "/invoice-monitoring": "Invoice Monitoring",
};

interface TopbarProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export default function Topbar({ onToggleSidebar }: TopbarProps) {
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] ?? "Dashboard";

  return (
    <header className="flex items-center gap-4 px-6 py-3.5 bg-white border-b border-slate-200 shrink-0 z-10">
      {/* Mobile toggle */}
      <button
        onClick={onToggleSidebar}
        className="md:hidden p-2 rounded-md text-slate-500 hover:bg-slate-100 active:scale-95 transition-all"
      >
        <Bars3Icon className="w-5 h-5" />
      </button>

      {/* Page title */}
      <div className="flex-1">
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        <p className="text-xs text-slate-400 hidden sm:block">
          Cryptware Admin Dashboard
        </p>
      </div>

      {/* Search */}
      <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-xl text-slate-400 text-sm w-56">
        <MagnifyingGlassIcon className="w-4 h-4 shrink-0" />
        <span>Search...</span>
      </div>

      {/* Notifications */}
      <button className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 active:scale-95 transition-all">
        <BellIcon className="w-5 h-5" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full ring-2 ring-white" />
      </button>

      {/* Avatar */}
      <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-slate-800 flex items-center justify-center text-white text-xs font-bold">
          SA
        </div>
        <div className="hidden sm:block">
          <p className="text-sm font-semibold text-slate-900 leading-tight">Super Admin</p>
          <p className="text-xs text-slate-400">admin@cryptware.io</p>
        </div>
      </div>
    </header>
  );
}
