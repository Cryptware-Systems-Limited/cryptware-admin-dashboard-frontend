import { useEffect, useState } from "react";
import StatCard from "@/components/ui/StatCard";
import {
  UsersIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
interface MetricsStats {
  totalClients: number;
  totalInvoices: number;
  monthlyInvoices: number;
  suspendedOrInactiveClients: number;
}

interface RecentActivityItem {
  id: string;
  businessName: string;
  lastInvoiceDate: string | null;
  totalInvoices: number;
  status: "Active" | "Suspended" | "Inactive Warning";
}

interface MetricsResponse {
  status: string;
  data: {
    stats: MetricsStats;
    recentActivity: RecentActivityItem[];
    generatedAt: string;
  };
}

// ── Static chart data (placeholder until reports endpoint is built) ───────────
const revenueData = [
  { month: "Jan", revenue: 42000, invoices: 320 },
  { month: "Feb", revenue: 55000, invoices: 410 },
  { month: "Mar", revenue: 48000, invoices: 380 },
  { month: "Apr", revenue: 63000, invoices: 490 },
  { month: "May", revenue: 71000, invoices: 560 },
  { month: "Jun", revenue: 68000, invoices: 530 },
];

const STATUS_STYLE: Record<RecentActivityItem["status"], string> = {
  Active:           "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Suspended:        "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400",
  "Inactive Warning": "bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700", className)} />
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Overview() {
  const [stats, setStats] = useState<MetricsStats | null>(null);
  const [activity, setActivity] = useState<RecentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<MetricsResponse>("/admin/metrics")
      .then((res) => {
        setStats(res.data.stats);
        setActivity(res.data.recentActivity);
      })
      .catch((err) => setError(err?.message ?? "Failed to load metrics"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">

      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-xl border border-orange-200 dark:border-orange-500/20 bg-white dark:bg-slate-900">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-600" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pl-6 pr-5 py-4">
          <div>
            <p className="text-xs font-semibold text-orange-600 uppercase tracking-widest mb-0.5">Admin Console</p>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Platform Overview</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Live summary of the Cryptware network.</p>
          </div>
          {stats && (
            <div className="flex items-center gap-6 sm:gap-8 shrink-0">
              <div className="text-center">
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.totalClients.toLocaleString()}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Clients</p>
              </div>
              <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
              <div className="text-center">
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.monthlyInvoices.toLocaleString()}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">This Month</p>
              </div>
              <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
              <div className="text-center">
                <p className={cn(
                  "text-xl font-bold",
                  stats.suspendedOrInactiveClients > 0 ? "text-red-600" : "text-emerald-600"
                )}>
                  {stats.suspendedOrInactiveClients}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Suspended</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-sm">
          <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Stats — 4 cards per PRD 4.3 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <Skeleton className="w-10 h-10 mb-4" />
              <Skeleton className="h-7 w-20 mb-2" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))
        ) : (
          <>
            <StatCard
              label="Total Clients"
              value={stats ? stats.totalClients.toLocaleString() : "—"}
              accent="navy"
              icon={<UsersIcon className="w-5 h-5" />}
            />
            <StatCard
              label="Total Invoices"
              value={stats ? stats.totalInvoices.toLocaleString() : "—"}
              accent="orange"
              icon={<DocumentTextIcon className="w-5 h-5" />}
            />
            <StatCard
              label="Invoices This Month"
              value={stats ? stats.monthlyInvoices.toLocaleString() : "—"}
              accent="green"
              icon={<CalendarDaysIcon className="w-5 h-5" />}
            />
            <StatCard
              label="Suspended / Inactive"
              value={stats ? stats.suspendedOrInactiveClients.toLocaleString() : "—"}
              accent="red"
              icon={<ExclamationTriangleIcon className="w-5 h-5" />}
            />
          </>
        )}
      </div>

      {/* Charts + Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Revenue trend chart (static placeholder — live data comes with reports endpoint) */}
        <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Invoice Volume Trend</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Monthly invoice volume · full data available via Reports</p>
            </div>
            <span className="text-xs font-medium text-orange-600 bg-orange-50 dark:bg-orange-500/10 px-3 py-1 rounded-full">2025</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ea580c" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}`} />
              <Tooltip
                contentStyle={{ border: "none", borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 12 }}
                formatter={(value) => [Number(value).toLocaleString(), "Invoices"]}
              />
              <Area type="monotone" dataKey="invoices" stroke="#ea580c" strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 5, fill: "#ea580c" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Recent client activity (live from API) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Recent Client Activity</h3>
            <span className="text-xs text-slate-400 dark:text-slate-500">Last 10 orgs</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              ))}
            </div>
          ) : activity.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">
              No recent activity
            </p>
          ) : (
            <div className="space-y-3">
              {activity.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 shrink-0">
                    <BuildingOfficeIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      {item.businessName}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {item.totalInvoices} invoices · {formatDate(item.lastInvoiceDate)}
                    </p>
                  </div>
                  <span className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded-full shrink-0",
                    STATUS_STYLE[item.status]
                  )}>
                    {item.status === "Inactive Warning" ? "Inactive" : item.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
