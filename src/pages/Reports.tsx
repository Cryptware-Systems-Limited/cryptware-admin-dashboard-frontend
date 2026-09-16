import { useEffect, useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  CalendarDaysIcon, UsersIcon, DocumentTextIcon,
  ExclamationTriangleIcon, EnvelopeIcon, ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────
type Period = "day" | "week" | "month" | "year" | "custom";

interface ReportStats {
  totalClientsAllTime: number;
  clientsOnboardedInPeriod: number;
  totalInvoicesAllTime: number;
  invoicesInPeriod: number;
  activeClientsInPeriod: number;
  inactiveClientsInPeriod: number;
}

interface StatusBreakdown { synced: number; pending: number; syncing: number; failed: number; }
interface TrendPoint { period: string; count: number; amount: number; }

interface TopClient {
  id: string; businessName: string; tin: string | null;
  invoicesInPeriod: number; totalInvoices: number;
  lastInvoiceDate: string | null; status: string; turnoverBand: string | null;
}

interface AllClient {
  id: string; businessName: string; tin: string | null;
  onboardingDate: string; firstInvoiceDate: string | null;
  lastInvoiceDate: string | null; totalInvoices: number; status: string;
}

interface ReportData {
  period: { label: string; start: string; end: string };
  stats: ReportStats;
  statusBreakdown: StatusBreakdown;
  volumeTrend: TrendPoint[];
  topClients: TopClient[];
  allClients: AllClient[];
  generatedAt: string;
}

interface ReportResponse { status: string; data: ReportData; }

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_BADGE: Record<string, string> = {
  Active:           "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Suspended:        "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400",
  "Inactive Warning": "bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700", className)} />;
}

const PIE_COLORS = { synced: "#22c55e", pending: "#eab308", syncing: "#3b82f6", failed: "#ef4444" };
const PIE_LABELS = { synced: "Synced", pending: "Pending", syncing: "Syncing", failed: "Failed" };

// ── Component ─────────────────────────────────────────────────────────────────
export default function Reports() {
  const [period, setPeriod]         = useState<Period>("month");
  const [fromDate, setFromDate]     = useState("");
  const [toDate, setToDate]         = useState("");
  const [appliedCustomRange, setAppliedCustomRange] = useState<{ from: string; to: string } | null>(null);
  const [data, setData]             = useState<ReportData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [sendingEmail, setSending]  = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (period === "custom") {
      const range = appliedCustomRange;
      if (!range) return;
      params.set("from_date", range.from);
      params.set("to_date", range.to);
    } else {
      params.set("period", period);
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ReportResponse>(`/admin/reports?${params}`);
      setData(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [period, appliedCustomRange]);

  useEffect(() => {
    const request = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(request);
  }, [load]);

  function handleApplyCustomRange() {
    if (!fromDate || !toDate) {
      toast.error("Select both a start date and an end date.");
      return;
    }
    if (fromDate > toDate) {
      toast.error("Start date cannot be after end date.");
      return;
    }
    setAppliedCustomRange({ from: fromDate, to: toDate });
  }

  async function handleSendEmail() {
    setSending(true);
    const params = new URLSearchParams();
    if (period === "custom") {
      if (!appliedCustomRange) {
        toast.error("Apply a custom date range before emailing the report.");
        setSending(false);
        return;
      }
      params.set("from_date", appliedCustomRange.from);
      params.set("to_date", appliedCustomRange.to);
    } else {
      params.set("period", period);
    }
    try {
      await api.post(`/admin/reports/send-email?${params}`);
      toast.success("Report emailed to all configured recipients.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send report email");
    } finally {
      setSending(false);
    }
  }

  const pieData = data
    ? Object.entries(data.statusBreakdown).map(([k, v]) => ({
        name: PIE_LABELS[k as keyof typeof PIE_LABELS],
        value: v,
        color: PIE_COLORS[k as keyof typeof PIE_COLORS],
      })).filter((d) => d.value > 0)
    : [];

  const PERIODS: { key: Period; label: string }[] = [
    { key: "day", label: "Day" },
    { key: "week", label: "Week" },
    { key: "month", label: "Month" },
    { key: "year", label: "Year" },
    { key: "custom", label: "Custom Range" },
  ];

  return (
    <div className="space-y-5">

      {/* ── Period Filter Bar ── */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm px-5 py-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                period === p.key
                  ? "bg-orange-600 text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {period === "custom" && (
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              max={toDate || new Date().toISOString().slice(0, 10)}
              aria-label="Report start date"
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400/30"
            />
            <span className="text-slate-400 text-sm">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              min={fromDate || undefined}
              max={new Date().toISOString().slice(0, 10)}
              aria-label="Report end date"
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400/30"
            />
            <button
              onClick={handleApplyCustomRange}
              disabled={!fromDate || !toDate || fromDate > toDate || (appliedCustomRange?.from === fromDate && appliedCustomRange?.to === toDate)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 disabled:opacity-50 transition-all"
            >
              <ArrowPathIcon className="w-3.5 h-3.5" /> Apply
            </button>
          </div>
        )}

        <div className="ml-auto flex items-center gap-3">
          {data && (
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {data.period.label}
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all disabled:opacity-50"
            title="Refresh"
          >
            <ArrowPathIcon className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
          <button
            onClick={handleSendEmail}
            disabled={sendingEmail || loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 active:scale-95 transition-all disabled:opacity-60 shadow-sm shadow-orange-600/20"
          >
            <EnvelopeIcon className="w-4 h-4" />
            {sendingEmail ? "Sending…" : "Email Report"}
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-sm">
          <ExclamationTriangleIcon className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* ── 4 Stat Cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Total Clients", value: data?.stats.totalClientsAllTime, icon: <UsersIcon className="w-5 h-5" />, accent: "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" },
          { label: "Invoices (Period)", value: data?.stats.invoicesInPeriod, icon: <DocumentTextIcon className="w-5 h-5" />, accent: "border-orange-500 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400" },
          { label: "Clients With Invoice Activity", value: data?.stats.activeClientsInPeriod, icon: <UsersIcon className="w-5 h-5" />, accent: "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
          { label: "Clients Without Invoice Activity", value: data?.stats.inactiveClientsInPeriod, icon: <ExclamationTriangleIcon className="w-5 h-5" />, accent: "border-red-500 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400" },
        ].map((card) => (
          <div key={card.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
            {loading ? (
              <><Skeleton className="w-10 h-10 mb-4" /><Skeleton className="h-7 w-20 mb-2" /><Skeleton className="h-4 w-28" /></>
            ) : (
              <>
                <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center mb-4", card.accent)}>
                  {card.icon}
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{card.value?.toLocaleString() ?? "—"}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{card.label}</p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Volume Trend */}
        <div id="report-volume-trend" className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Invoice Volume Trend</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-5">Invoice count by period</p>
          {loading ? <Skeleton className="h-56 w-full" /> : data && data.volumeTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.volumeTrend} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ border: "none", borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 12 }}
                  formatter={(v, name) => [name === "count" ? Number(v).toLocaleString() + " invoices" : "₦" + Number(v).toLocaleString(), ""]}
                />
                <Bar dataKey="count" name="count" fill="#ea580c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-56 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
              No invoice activity in this period
            </div>
          )}
        </div>

        {/* Status Breakdown */}
        <div id="report-invoice-status" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Invoice Status</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">FIRS sync status breakdown</p>
          {loading ? <Skeleton className="h-48 w-full" /> : pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ border: "none", borderRadius: 12, fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1.5">
                {pieData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-600 dark:text-slate-400">{item.name}</span>
                    </div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
              No invoice data for this period
            </div>
          )}
        </div>
      </div>

      {/* ── Top 10 Clients Table ── */}
      <div id="top-clients" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <CalendarDaysIcon className="w-4 h-4 text-orange-500" />
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Top 10 Clients by Invoice Volume</h3>
          <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">{data?.period.label}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                {["Client Name", "TIN", "Invoices (Period)", "Total (All Time)", "Last Active", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50 dark:border-slate-800/50">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    ))}
                  </tr>
                ))
              ) : data?.topClients.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-500">No invoice activity in this period</td></tr>
              ) : (
                data?.topClients.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 max-w-[200px] truncate">{c.businessName}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-xs">{c.tin ?? "—"}</td>
                    <td className="px-4 py-3 font-bold text-orange-600">{c.invoicesInPeriod.toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{c.totalInvoices.toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{fmtDate(c.lastInvoiceDate)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", STATUS_BADGE[c.status] ?? STATUS_BADGE.Active)}>{c.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── All Clients Table ── */}
      <div id="report-all-clients" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <UsersIcon className="w-4 h-4 text-blue-500" />
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">All Clients</h3>
          {data && <span className="ml-1 text-xs text-slate-400 dark:text-slate-500">({data.allClients.length})</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                {["Client Name", "TIN", "Onboarded", "First Invoice", "Last Invoice", "Total Invoices", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50 dark:border-slate-800/50">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : data?.allClients.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-500">No clients</td></tr>
              ) : (
                data?.allClients.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 max-w-[200px] truncate">{c.businessName}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-xs">{c.tin ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{fmtDate(c.onboardingDate)}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{fmtDate(c.firstInvoiceDate)}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{fmtDate(c.lastInvoiceDate)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">{c.totalInvoices.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", STATUS_BADGE[c.status] ?? STATUS_BADGE.Active)}>{c.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
