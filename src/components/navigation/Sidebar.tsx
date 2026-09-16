import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  HomeIcon,
  ChartBarIcon,
  UsersIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  Cog6ToothIcon,
  CreditCardIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeSolid,
  ChartBarIcon as ChartSolid,
  UsersIcon as UsersSolid,
  GlobeAltIcon as GlobeSolid,
  DocumentTextIcon as DocSolid,
  Cog6ToothIcon as CogSolid,
  CreditCardIcon as CreditCardSolid,
} from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";
import { useEnv, type AppEnv } from "@/context/EnvContext";
import { useAuth } from "@/context/AuthContext";
import BrandMark from "@/components/BrandMark";

const NAV_ITEMS = [
  { label: "Overview", href: "/overview", icon: HomeIcon, iconActive: HomeSolid },
  { label: "Reports", href: "/reports", icon: ChartBarIcon, iconActive: ChartSolid },
  { label: "Clients", href: "/clients", icon: UsersIcon, iconActive: UsersSolid },
  { label: "Geographic Coverage", href: "/geographic-coverage", icon: GlobeAltIcon, iconActive: GlobeSolid },
  { label: "Invoice Monitoring", href: "/invoice-monitoring", icon: DocumentTextIcon, iconActive: DocSolid },
  { label: "Pricing & Billing", href: "/pricing-billing/subscriptions", icon: CreditCardIcon, iconActive: CreditCardSolid },
];

const SETTINGS_ITEM = { label: "Settings", href: "/settings", icon: Cog6ToothIcon, iconActive: CogSolid };

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { env, isProd, switchEnv } = useEnv();
  const { role } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingEnv, setPendingEnv] = useState<AppEnv | null>(null);

  function requestSwitch(next: AppEnv) {
    if (next === env) return;
    setPendingEnv(next);
    setConfirmOpen(true);
  }

  function confirmSwitch() {
    if (!pendingEnv) return;
    switchEnv(pendingEnv, () => navigate("/login"));
    setConfirmOpen(false);
  }

  const isClientsActive =
    location.pathname === "/clients" || location.pathname.startsWith("/clients/");

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="relative flex flex-col h-full bg-white dark:bg-slate-950 shrink-0 overflow-hidden z-20 transition-colors border-r border-slate-200 dark:border-slate-800 shadow-[4px_0_24px_rgba(15,23,42,0.06)] dark:shadow-[4px_0_24px_rgba(15,23,42,0.25)]"
    >
      {/* Logo */}
      <div className="relative flex h-[72px] shrink-0 items-center gap-3 px-4 border-b border-slate-200 dark:border-slate-800/60">
        <BrandMark className="h-9 w-9" />
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <p className="text-slate-900 dark:text-white font-bold text-sm leading-tight whitespace-nowrap">Cryptware</p>
              <p className="text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">Admin Console</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {[...NAV_ITEMS, ...(role === "SYSTEM_ADMIN" ? [SETTINGS_ITEM] : [])].map((item) => {
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
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-900"
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
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl border border-slate-200 dark:border-slate-700 z-50">
                  {item.label}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-white dark:border-r-slate-900" />
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-4 border-t border-slate-200 dark:border-slate-800/60 pt-3 space-y-2">

        {/* Environment switcher */}
        <AnimatePresence>
          {!collapsed ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mx-0.5"
            >
              <p className="text-slate-500 dark:text-slate-500 text-[10px] font-medium uppercase tracking-wider mb-1.5 px-1">Environment</p>
              <div className="flex rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 text-xs font-semibold">
                <button
                  onClick={() => requestSwitch("preprod")}
                  className={cn(
                    "flex-1 py-1.5 transition-colors",
                    env === "preprod"
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700"
                  )}
                >
                  Preprod
                </button>
                <button
                  onClick={() => requestSwitch("prod")}
                  className={cn(
                    "flex-1 py-1.5 transition-colors",
                    env === "prod"
                      ? "bg-red-600 text-white"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700"
                  )}
                >
                  Prod
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center"
            >
              <button
                onClick={() => requestSwitch(env === "prod" ? "preprod" : "prod")}
                title={`Switch to ${env === "prod" ? "Preprod" : "Prod"}`}
                className={cn(
                  "w-8 h-8 rounded-lg text-[10px] font-bold transition-colors flex items-center justify-center",
                  isProd ? "bg-red-600 text-white" : "bg-blue-600 text-white"
                )}
              >
                {isProd ? "P" : "D"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 px-2.5 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-900 active:scale-95 transition-all duration-200"
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

      {/* Switch confirmation modal */}
      {confirmOpen && pendingEnv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                pendingEnv === "prod" ? "bg-red-100 dark:bg-red-500/10" : "bg-blue-100 dark:bg-blue-500/10"
              )}>
                <ExclamationTriangleIcon className={cn(
                  "w-5 h-5",
                  pendingEnv === "prod" ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"
                )} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                  Switch to {pendingEnv === "prod" ? "Production" : "Preprod"}?
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {pendingEnv === "prod"
                    ? "You will be connecting to live production data. All actions are real and immediate."
                    : "You will switch back to the preprod/test environment."}
                  {" "}You'll need to log in again.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmSwitch}
                className={cn(
                  "px-4 py-2 rounded-xl text-white text-sm font-semibold transition active:scale-95",
                  pendingEnv === "prod" ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
                )}
              >
                Switch & Log In
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.aside>
  );
}
