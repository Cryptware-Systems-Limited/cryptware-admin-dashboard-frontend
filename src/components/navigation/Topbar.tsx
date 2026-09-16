import {
  BellIcon,
  MagnifyingGlassIcon,
  Bars3Icon,
  SunIcon,
  MoonIcon,
  ArrowRightStartOnRectangleIcon,
  CheckIcon,
  EnvelopeIcon,
  TrashIcon,
  XMarkIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface AdminNotification {
  id: string;
  type: string;
  category: string;
  title: string;
  message: string;
  action: string;
  actionUrl: string | null;
  outcome: "SUCCESS" | "FAILED";
  readAt: string | null;
  createdAt: string;
}

interface NotificationResponse {
  status: string;
  data: { notifications: AdminNotification[]; unread: number };
}

function relativeTime(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days}d ago` : new Date(value).toLocaleDateString("en-GB");
}

const PAGE_TITLES: Record<string, string> = {
  "/overview": "Overview",
  "/reports": "Reports",
  "/clients": "Clients",
  "/geographic-coverage": "Geographic Coverage",
  "/invoice-monitoring": "Invoice Monitoring",
  "/pricing-billing/subscriptions": "Subscription Monitoring",
};

const ROLE_LABEL: Record<string, string> = {
  SYSTEM_ADMIN:     "System Admin",
  SYSTEM_DEVELOPER: "Developer",
  SYSTEM_VIEWER:    "Viewer",
};

interface DashboardDestination {
  label: string;
  path: string;
  description: string;
  keywords: string;
  section?: boolean;
  systemAdminOnly?: boolean;
}

const DASHBOARD_DESTINATIONS: DashboardDestination[] = [
  { label: "Overview", path: "/overview", description: "Platform dashboard and quick actions", keywords: "home dashboard" },
  { label: "Reports", path: "/reports", description: "Analytics and reports", keywords: "statistics charts" },
  { label: "Clients", path: "/clients", description: "Client list and profiles", keywords: "organisations organizations customers" },
  { label: "Geographic Coverage", path: "/geographic-coverage", description: "Client activity by location", keywords: "map countries regions" },
  { label: "Invoice Monitoring", path: "/invoice-monitoring", description: "Invoice processing and status", keywords: "invoices documents" },
  { label: "Subscription Monitoring", path: "/pricing-billing/subscriptions", description: "Plans, payments, and renewals", keywords: "pricing billing subscriptions reminders" },
  { label: "Settings", path: "/settings", description: "Admin settings and user management", keywords: "users roles notifications audit", systemAdminOnly: true },
  { label: "Quick Actions", path: "/overview#quick-actions", description: "Overview · client search and actions", keywords: "find client retry invoices", section: true },
  { label: "Invoice Volume Trend", path: "/overview#invoice-volume-trend", description: "Overview · platform invoice chart", keywords: "monthly quarterly annual", section: true },
  { label: "Recent Client Activity", path: "/overview#recent-client-activity", description: "Overview · latest organisations", keywords: "recent clients", section: true },
  { label: "Client Status Distribution", path: "/overview#client-status-distribution", description: "Overview · client status chart", keywords: "active suspended", section: true },
  { label: "Onboarded Client Transmissions", path: "/overview#onboarded-transmissions", description: "Overview · test and production exports", keywords: "download csv", section: true },
  { label: "Invoice Volume Report", path: "/reports#report-volume-trend", description: "Reports · invoice volume trend", keywords: "chart analytics", section: true },
  { label: "Invoice Status Report", path: "/reports#report-invoice-status", description: "Reports · invoice status breakdown", keywords: "chart firs", section: true },
  { label: "Top 10 Clients", path: "/reports#top-clients", description: "Reports · clients by invoice volume", keywords: "ranking", section: true },
  { label: "All Clients Report", path: "/reports#report-all-clients", description: "Reports · full client activity table", keywords: "client invoices", section: true },
  { label: "Client Master List", path: "/clients?tab=master#client-tabs", description: "Clients · CRM master list", keywords: "customers organisations", section: true },
  { label: "Dashboard Migration", path: "/clients?tab=migration#client-tabs", description: "Clients · migration tracking", keywords: "credentials go live", section: true },
  { label: "Onboarded Clients", path: "/clients?tab=onboarded#client-tabs", description: "Clients · onboarded client list", keywords: "status activity filters", section: true },
  { label: "Nigeria Map", path: "/geographic-coverage#nigeria-map", description: "Geographic Coverage · client map", keywords: "states location", section: true },
  { label: "Zone Summary", path: "/geographic-coverage#zone-summary", description: "Geographic Coverage · regional totals", keywords: "zones", section: true },
  { label: "Zone Panel Breakdown", path: "/geographic-coverage#zone-breakdown", description: "Geographic Coverage · zone details", keywords: "regions", section: true },
  { label: "Clients per State", path: "/geographic-coverage#clients-per-state", description: "Geographic Coverage · state breakdown", keywords: "locations", section: true },
  { label: "Invoice Monitor", path: "/invoice-monitoring#invoice-monitor", description: "Invoice Monitoring · invoice table", keywords: "paid pending overdue", section: true },
  { label: "Subscription Health Cards", path: "/pricing-billing/subscriptions#subscription-health", description: "Subscription Monitoring · active, due, and grace", keywords: "cancelled renewing soon payment", section: true },
  { label: "Subscription Filters", path: "/pricing-billing/subscriptions#subscription-filters", description: "Subscription Monitoring · search and filters", keywords: "plan payment renewal reminder", section: true },
  { label: "Client Subscriptions", path: "/pricing-billing/subscriptions#subscription-table", description: "Subscription Monitoring · subscription table", keywords: "details clients", section: true },
  { label: "General Settings", path: "/settings?section=general#settings-content", description: "Settings · platform defaults", keywords: "configuration", section: true, systemAdminOnly: true },
  { label: "User Management", path: "/settings?section=users-roles&view=users#settings-content", description: "Settings · administrators and access", keywords: "add user invite deactivate reset password", section: true, systemAdminOnly: true },
  { label: "Roles & Permissions", path: "/settings?section=users-roles&view=roles#settings-content", description: "Settings · access roles", keywords: "user role management", section: true, systemAdminOnly: true },
  { label: "Notification Settings", path: "/settings?section=notifications#settings-content", description: "Settings · alert configuration", keywords: "email notifications", section: true, systemAdminOnly: true },
  { label: "Report Settings", path: "/settings?section=reports#settings-content", description: "Settings · report configuration", keywords: "schedule", section: true, systemAdminOnly: true },
  { label: "System Configuration", path: "/settings?section=system#settings-content", description: "Settings · integrations and environment", keywords: "system health", section: true, systemAdminOnly: true },
  { label: "Audit Logs", path: "/settings?section=audit#settings-content", description: "Settings · administrative activity", keywords: "history events", section: true, systemAdminOnly: true },
];

interface TopbarProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export default function Topbar({ onToggleSidebar }: TopbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { role, logout } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(0);

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const searchResults = DASHBOARD_DESTINATIONS.filter((destination) => {
    if (destination.systemAdminOnly && role !== "SYSTEM_ADMIN") return false;
    if (!normalizedSearchQuery) return !destination.section;
    const searchableText = `${destination.label} ${destination.description} ${destination.keywords}`.toLowerCase();
    return searchableText.includes(normalizedSearchQuery);
  }).sort((first, second) => {
    const score = (item: DashboardDestination) => item.label.toLowerCase() === normalizedSearchQuery ? 0 :
      item.label.toLowerCase().startsWith(normalizedSearchQuery) ? 1 :
        item.label.toLowerCase().includes(normalizedSearchQuery) ? 2 : 3;
    return score(first) - score(second);
  });

  const openSearch = useCallback(() => {
    setSearchQuery("");
    setSelectedSearchIndex(0);
    setSearchOpen(true);
  }, []);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [openSearch]);

  function goToSearchResult(path: string) {
    setSearchOpen(false);
    navigate(path);
  }

  const loadNotifications = useCallback(async () => {
    try {
      setNotificationsLoading(true);
      const response = await api.get<NotificationResponse>("/admin/notifications?limit=20");
      setNotifications(response.data.notifications);
      setUnread(response.data.unread);
    } catch {
      // The bell remains usable if notifications are unavailable during rollout.
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadNotifications(), 0);
    const interval = window.setInterval(() => void loadNotifications(), 60_000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [loadNotifications]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function markRead(notification: AdminNotification) {
    if (!notification.readAt) {
      await api.put(`/admin/notifications/${notification.id}/read`);
      setNotifications(items => items.map(item => item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item));
      setUnread(value => Math.max(0, value - 1));
    }
  }

  async function openNotification(notification: AdminNotification) {
    await markRead(notification);
    setNotificationsOpen(false);
    if (notification.actionUrl) navigate(notification.actionUrl);
  }

  const title =
    PAGE_TITLES[location.pathname] ??
    (location.pathname.startsWith("/clients/") ? "Client Profile" : "Dashboard");

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="flex h-[72px] items-center gap-4 px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 z-10 transition-colors">
      {/* Mobile toggle */}
      <button
        onClick={onToggleSidebar}
        className="md:hidden p-2 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
      >
        <Bars3Icon className="w-5 h-5" />
      </button>

      {/* Page title */}
      <div className="flex-1">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
        <p className="text-xs text-slate-400 dark:text-slate-500 hidden sm:block">
          Cryptware Admin Dashboard
        </p>
      </div>

      {/* Search */}
      <button
        type="button"
        onClick={openSearch}
        aria-label="Search dashboard pages"
        aria-keyshortcuts="Control+K Meta+K"
        className="flex items-center gap-2 rounded-xl border border-transparent bg-slate-100 p-2 text-sm text-slate-500 transition hover:border-slate-300 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white sm:w-56 sm:px-3"
      >
        <MagnifyingGlassIcon className="w-4 h-4 shrink-0" />
        <span className="hidden flex-1 text-left sm:block">Search anywhere...</span>
        <kbd className="hidden rounded border border-slate-300 px-1 text-[10px] dark:border-slate-600 sm:block">Ctrl K</kbd>
      </button>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
        aria-label="Toggle theme"
      >
        {theme === "dark" ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
      </button>

      {/* Notifications */}
      <div className="relative" ref={notificationRef}>
        <button
          onClick={() => { setNotificationsOpen(open => !open); if (!notificationsOpen) void loadNotifications(); }}
          className="relative p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
          aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        >
          <BellIcon className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 flex items-center justify-center bg-orange-500 text-white text-[9px] font-bold rounded-full ring-2 ring-white dark:ring-slate-900">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>

        {notificationsOpen && (
          <div className="absolute right-0 top-11 w-[min(24rem,calc(100vw-2rem))] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Notifications</p>
                <p className="text-[11px] text-slate-400">{unread} unread</p>
              </div>
              {unread > 0 && (
                <button
                  onClick={async () => { await api.put("/admin/notifications/read-all"); setNotifications(items => items.map(item => ({ ...item, readAt: item.readAt ?? new Date().toISOString() }))); setUnread(0); }}
                  className="ml-auto text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:underline"
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="max-h-[28rem] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {notificationsLoading && notifications.length === 0 ? (
                <p className="py-10 text-center text-xs text-slate-400">Loading notifications…</p>
              ) : notifications.length === 0 ? (
                <p className="py-10 text-center text-xs text-slate-400">You have no notifications.</p>
              ) : notifications.map(notification => (
                <div key={notification.id} className={cn("group flex gap-3 px-4 py-3", !notification.readAt && "bg-orange-50/60 dark:bg-orange-500/5")}>
                  <button onClick={() => void openNotification(notification)} className="flex gap-3 min-w-0 flex-1 text-left">
                    <span className={cn("mt-1 w-2 h-2 rounded-full shrink-0", notification.outcome === "FAILED" ? "bg-red-500" : notification.readAt ? "bg-slate-300 dark:bg-slate-600" : "bg-orange-500")} />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{notification.title}</span>
                        <span className="text-[9px] uppercase text-slate-400 shrink-0">{notification.category}</span>
                      </span>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{notification.message}</span>
                      <span className="block text-[10px] text-slate-400 mt-1">{relativeTime(notification.createdAt)} · {notification.outcome.toLowerCase()}</span>
                    </span>
                  </button>
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button
                      title={notification.readAt ? "Mark unread" : "Mark read"}
                      onClick={async () => {
                        if (notification.readAt) {
                          await api.put(`/admin/notifications/${notification.id}/unread`);
                          setNotifications(items => items.map(item => item.id === notification.id ? { ...item, readAt: null } : item));
                          setUnread(value => value + 1);
                        } else await markRead(notification);
                      }}
                      className="p-1 text-slate-400 hover:text-orange-600"
                    >
                      {notification.readAt ? <EnvelopeIcon className="w-3.5 h-3.5" /> : <CheckIcon className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      title="Dismiss"
                      onClick={async () => { await api.delete(`/admin/notifications/${notification.id}`); setNotifications(items => items.filter(item => item.id !== notification.id)); if (!notification.readAt) setUnread(value => Math.max(0, value - 1)); }}
                      className="p-1 text-slate-400 hover:text-red-500"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Avatar + role + logout */}
      <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200 dark:border-slate-700">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-slate-800 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {role === 'SYSTEM_ADMIN' ? 'SA' : role === 'SYSTEM_DEVELOPER' ? 'DE' : 'VI'}
        </div>
        <div className="hidden sm:block">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
            {role ? ROLE_LABEL[role] : 'Admin'}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">eegbowon@cryptwaresystems.com</p>
        </div>

        <button
          onClick={handleLogout}
          title="Sign out"
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all ml-1"
        >
          <ArrowRightStartOnRectangleIcon className="w-4 h-4" />
        </button>
      </div>
      {searchOpen && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/60 px-4 pt-[min(18vh,9rem)] backdrop-blur-sm"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setSearchOpen(false); }}
        >
          <div role="dialog" aria-modal="true" aria-label="Search dashboard pages and sections" className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <MagnifyingGlassIcon className="h-5 w-5 shrink-0 text-slate-400" />
              <input
                autoFocus
                type="search"
                value={searchQuery}
                onChange={(event) => { setSearchQuery(event.target.value); setSelectedSearchIndex(0); }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setSearchOpen(false);
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setSelectedSearchIndex((index) => searchResults.length ? (index + 1) % searchResults.length : 0);
                  }
                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setSelectedSearchIndex((index) => searchResults.length ? (index - 1 + searchResults.length) % searchResults.length : 0);
                  }
                  if (event.key === "Enter" && searchResults[selectedSearchIndex]) {
                    goToSearchResult(searchResults[selectedSearchIndex].path);
                  }
                }}
                placeholder="Search pages or sections..."
                aria-label="Search dashboard pages and sections"
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
              />
              <button type="button" onClick={() => setSearchOpen(false)} aria-label="Close search" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[min(24rem,55vh)] overflow-y-auto p-2">
              {searchResults.length ? searchResults.map((destination, index) => (
                <button
                  key={destination.path}
                  type="button"
                  onClick={() => goToSearchResult(destination.path)}
                  onMouseEnter={() => setSelectedSearchIndex(index)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                    index === selectedSearchIndex ? "bg-orange-50 dark:bg-orange-500/10" : "hover:bg-slate-50 dark:hover:bg-slate-800",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">{destination.label}</span>
                    <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{destination.description}</span>
                  </span>
                  {location.pathname + location.search + location.hash === destination.path ? (
                    <span className="text-[10px] font-medium text-orange-600 dark:text-orange-400">Current</span>
                  ) : destination.section ? (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">Section</span>
                  ) : <ArrowRightIcon className="h-4 w-4 text-slate-400" />}
                </button>
              )) : (
                <p className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No matching pages</p>
              )}
            </div>
            <div className="border-t border-slate-200 px-4 py-2 text-[11px] text-slate-400 dark:border-slate-700">Use ↑ ↓ to choose · Enter to open · Esc to close</div>
          </div>
        </div>,
        document.body,
      )}
    </header>
  );
}
