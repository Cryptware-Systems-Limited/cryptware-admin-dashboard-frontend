import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  HomeIcon,
  ChartBarIcon,
  UsersIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeSolid,
  ChartBarIcon as ChartSolid,
  UsersIcon as UsersSolid,
  GlobeAltIcon as GlobeSolid,
  DocumentTextIcon as DocSolid,
} from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Overview", href: "/overview", icon: HomeIcon, iconActive: HomeSolid },
  { label: "Reports", href: "/reports", icon: ChartBarIcon, iconActive: ChartSolid },
  { label: "Clients", href: "/clients", icon: UsersIcon, iconActive: UsersSolid },
  { label: "Geographic Coverage", href: "/geographic-coverage", icon: GlobeAltIcon, iconActive: GlobeSolid },
  { label: "Invoice Monitoring", href: "/invoice-monitoring", icon: DocumentTextIcon, iconActive: DocSolid },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();

  const isClientsActive =
    location.pathname === "/clients" || location.pathname.startsWith("/clients/");

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="relative flex flex-col h-full bg-slate-900 dark:bg-slate-950 shrink-0 overflow-hidden z-20 transition-colors"
      style={{ boxShadow: "4px 0 24px rgba(15,23,42,0.25)" }}
    >
      {/* Decorative gradient */}
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-orange-600/15 to-transparent pointer-events-none" />

      {/* Logo */}
      <div className="relative flex items-center gap-3 px-4 py-5 border-b border-slate-700/60 dark:border-slate-800/60">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-orange-600 shrink-0 shadow-lg shadow-orange-600/30">
          <span className="text-white font-bold text-sm">CW</span>
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <p className="text-white font-bold text-sm leading-tight whitespace-nowrap">Cryptware</p>
              <p className="text-slate-400 text-xs whitespace-nowrap">Admin Console</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/clients"
              ? isClientsActive
              : location.pathname === item.href;
          const Icon = isActive ? item.iconActive : item.icon;

          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={cn(
                "group relative flex items-center gap-3 px-2.5 py-2.5 rounded-lg active:scale-95 transition-all duration-200",
                isActive
                  ? "bg-orange-600 text-white shadow-lg shadow-orange-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-900"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 rounded-lg bg-orange-600"
                  style={{ zIndex: -1 }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}

              <Icon className="w-5 h-5 shrink-0" />

              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.15 }}
                    className="text-sm font-medium whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>

              {collapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-800 dark:bg-slate-900 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl border border-slate-700 z-50">
                  {item.label}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-4 border-t border-slate-700/60 dark:border-slate-800/60 pt-3">
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mb-3 mx-0.5 px-3 py-2 bg-slate-800 dark:bg-slate-900 rounded-xl"
            >
              <p className="text-slate-400 text-xs">Logged in as</p>
              <p className="text-white text-sm font-semibold truncate">Super Admin</p>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 px-2.5 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-900 active:scale-95 transition-all duration-200"
        >
          {collapsed ? (
            <ChevronRightIcon className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeftIcon className="w-4 h-4" />
              <span className="text-xs font-medium">Collapse</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );
}
