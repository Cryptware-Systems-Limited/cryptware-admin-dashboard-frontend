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
} from "@heroicons/react/24/outline";
import { useCallback, useEffect, useRef, useState } from "react";
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
    <header className="flex items-center gap-4 px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 z-10 transition-colors">
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
      <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400 dark:text-slate-500 text-sm w-56 border border-transparent dark:border-slate-700">
        <MagnifyingGlassIcon className="w-4 h-4 shrink-0" />
        <span>Search...</span>
      </div>

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
    </header>
  );
}
