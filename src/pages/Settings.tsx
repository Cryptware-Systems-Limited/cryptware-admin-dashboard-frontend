import { useState, type ComponentType, type SVGProps } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AdjustmentsHorizontalIcon,
  BellAlertIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  DocumentChartBarIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import SystemUsersPanel from "@/components/settings/SystemUsersPanel";
import SystemRolesPanel from "@/components/settings/SystemRolesPanel";
import NotificationSettingsPanel from "@/components/settings/NotificationSettingsPanel";
import AuditLogPanel from "@/components/settings/AuditLogPanel";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

interface SettingsCategory {
  id: string;
  title: string;
  description: string;
  icon: Icon;
  accent: string;
}

const CATEGORIES: SettingsCategory[] = [
  {
    id: "general",
    title: "General Settings",
    description:
      "Manage platform identity, defaults, and general administrative preferences.",
    icon: AdjustmentsHorizontalIcon,
    accent: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  },
  {
    id: "users-roles",
    title: "User & Role Management",
    description:
      "Manage administrators, access roles, and system-level permissions.",
    icon: UserGroupIcon,
    accent:
      "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
  },
  {
    id: "notifications",
    title: "Notification Settings",
    description:
      "Configure operational alerts, delivery channels, and notification rules.",
    icon: BellAlertIcon,
    accent:
      "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
  },
  {
    id: "reports",
    title: "Report Settings",
    description:
      "Control scheduled reports, recipients, formats, and delivery preferences.",
    icon: DocumentChartBarIcon,
    accent:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  },
  {
    id: "system",
    title: "System Configuration",
    description:
      "Review environment-wide configuration and integration settings.",
    icon: Cog6ToothIcon,
    accent: "bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400",
  },
  {
    id: "audit",
    title: "Audit Logs",
    description:
      "Review administrative actions, outcomes, actors, and timestamps.",
    icon: ClipboardDocumentListIcon,
    accent: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
  },
];

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = searchParams.get("section");
  const selectedId = CATEGORIES.some(
    (category) => category.id === requestedSection,
  )
    ? requestedSection!
    : CATEGORIES[0].id;
  const [accessView, setAccessView] = useState<"users" | "roles">("users");
  const selected =
    CATEGORIES.find((category) => category.id === selectedId) ?? CATEGORIES[0];
  const SelectedIcon = selected.icon;
  const selectCategory = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("section", id);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">
            System administration
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            Admin Settings
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage platform-wide configuration from one secure workspace.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
          <ShieldCheckIcon className="h-4 w-4" />
          System Administrator only
        </div>
      </div>

      <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:h-[calc(100vh-13rem)] lg:min-h-[520px] lg:grid-cols-[310px_1fr]">
        <aside className="border-b border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40 lg:min-h-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Settings categories
          </p>
          <nav className="space-y-1" aria-label="Settings categories">
            {CATEGORIES.map((category) => {
              const CategoryIcon = category.icon;
              const active = category.id === selectedId;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => selectCategory(category.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition",
                    active
                      ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-white dark:ring-slate-700"
                      : "text-slate-600 hover:bg-white/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white",
                  )}
                >
                  <CategoryIcon
                    className={cn(
                      "h-5 w-5 shrink-0",
                      active && "text-orange-600 dark:text-orange-400",
                    )}
                  />
                  <span className="min-w-0 flex-1 text-sm font-semibold">
                    {category.title}
                  </span>
                  <ChevronRightIcon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      active ? "text-orange-500" : "text-slate-400",
                    )}
                  />
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="p-6 sm:p-8 lg:min-h-0 lg:overflow-y-auto">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-500/10">
            <SelectedIcon className="h-7 w-7 text-orange-600 dark:text-orange-400" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">
            {selected.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            {selected.description}
          </p>

          {selected.id === "audit" ? (
            <AuditLogPanel />
          ) : selected.id === "notifications" ? (
            <NotificationSettingsPanel />
          ) : selected.id === "users-roles" ? (
            <div className="mt-6">
              <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  onClick={() => setAccessView("users")}
                  className={cn(
                    "rounded-lg px-4 py-2 text-sm font-semibold transition",
                    accessView === "users"
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-500",
                  )}
                >
                  Users
                </button>
                <button
                  onClick={() => setAccessView("roles")}
                  className={cn(
                    "rounded-lg px-4 py-2 text-sm font-semibold transition",
                    accessView === "roles"
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-500",
                  )}
                >
                  Roles & Permissions
                </button>
              </div>
              {accessView === "users" ? (
                <SystemUsersPanel />
              ) : (
                <SystemRolesPanel />
              )}
            </div>
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {CATEGORIES.map((category) => {
                const CategoryIcon = category.icon;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => selectCategory(category.id)}
                    className="group flex items-start gap-4 rounded-2xl border border-slate-200 p-4 text-left transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md dark:border-slate-800 dark:hover:border-orange-500/40"
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        category.accent,
                      )}
                    >
                      <CategoryIcon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-slate-900 group-hover:text-orange-600 dark:text-white dark:group-hover:text-orange-400">
                        {category.title}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {category.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
