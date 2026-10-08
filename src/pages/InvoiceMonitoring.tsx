import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowPathIcon, CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon,
  ExclamationCircleIcon, ExclamationTriangleIcon, MagnifyingGlassIcon, ServerStackIcon,
} from "@heroicons/react/24/outline";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type MonitorStatus = "PENDING" | "SUCCESSFUL" | "FAILED" | "REJECTED" | "UNKNOWN";
interface InvoiceRecord {
  id: string; invoiceNumber: string; irn: string; customerName: string;
  client: { id: string; name: string }; currentStatus: MonitorStatus;
  processingStatus: string; createdAt: string; updatedAt: string;
  retryCount: number; errorReason: string | null;
}
interface MonitoringData {
  summary: { pending: number; successful: number; failed: number; rejected: number; total: number };
  health: { status: "HEALTHY" | "PROCESSING" | "ATTENTION"; processing: number; issues: number };
  recentAlerts: Array<{ id: string; irn: string; client: string; message: string; occurredAt: string }>;
  invoices: InvoiceRecord[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  refreshedAt: string;
}
interface ApiHealthData {
  availabilityPercent: number; averageResponseTimeMs: number; errorRatePercent: number;
  status: "HEALTHY" | "DEGRADED" | "DOWN" | "MAINTENANCE";
  totalRequests: number; failedRequests: number; measuredSince: string;
  processUptimeSeconds: number; refreshedAt: string;
}

const statusStyles: Record<MonitorStatus, string> = {
  PENDING: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  SUCCESSFUL: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  FAILED: "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400",
  REJECTED: "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400",
  UNKNOWN: "border-slate-500/20 bg-slate-500/10 text-slate-600 dark:text-slate-400",
};
const RETRYABLE_STATES = new Set(["FAILED", "RETRY_PENDING", "VALIDATION_FAILED", "SIGNING_FAILED", "TRANSMISSION_FAILED"]);
const formatDate = (value: string) => new Intl.DateTimeFormat("en-NG", {
  day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
}).format(new Date(value));

export default function InvoiceMonitoring() {
  const navigate = useNavigate();
  const { canWrite } = useAuth();
  const [data, setData] = useState<MonitoringData | null>(null);
  const [apiHealth, setApiHealth] = useState<ApiHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      if (search) params.set("search", search);
      if (status !== "ALL") params.set("status", status);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const [response, healthResponse] = await Promise.all([
        api.get<{ status: string; data: MonitoringData }>(`/api/invoices?${params}`),
        api.get<{ status: string; data: ApiHealthData }>("/api/system-health"),
      ]);
      setData(response.data); setApiHealth(healthResponse.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Failed to load invoice monitoring data");
    } finally { setLoading(false); }
  }, [from, page, search, status, to]);
  // Loading is the external synchronization performed by this effect.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const retryInvoice = async (invoice: InvoiceRecord) => {
    setRetryingId(invoice.id); setError(null); setActionMessage(null);
    try {
      await api.post(`/api/invoices/${invoice.id}/retry`);
      setActionMessage(`${invoice.invoiceNumber || invoice.irn} was queued for retry.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Failed to retry invoice");
    } finally { setRetryingId(null); }
  };

  const summary = data?.summary ?? { pending: 0, successful: 0, failed: 0, rejected: 0, total: 0 };
  const cards = [
    { label: "Pending Invoices", value: summary.pending, icon: ClockIcon, tone: "bg-amber-500/10 text-amber-500" },
    { label: "Successful Invoices", value: summary.successful, icon: CheckCircleIcon, tone: "bg-emerald-500/10 text-emerald-500" },
    { label: "Failed Invoices", value: summary.failed, icon: ExclamationTriangleIcon, tone: "bg-red-500/10 text-red-500" },
    { label: "Rejected Invoices", value: summary.rejected, icon: ExclamationCircleIcon, tone: "bg-rose-500/10 text-rose-500" },
  ];

  return <div className="space-y-5">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div><h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Invoice Monitoring</h2><p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Monitor invoice processing across all client organisations</p></div>
      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400"><span>{data ? `Last refreshed ${formatDate(data.refreshedAt)}` : "Not refreshed"}</span><button onClick={() => void load()} disabled={loading} aria-label="Refresh invoices" className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"><ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button></div>
    </header>

    {error && <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"><span>{error}</span><button onClick={() => void load()} className="font-semibold">Try again</button></div>}
    {actionMessage && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">{actionMessage}</div>}

    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, tone }) => <div key={label} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className={`rounded-xl p-3 ${tone}`}><Icon className="h-5 w-5" /></div><div><p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{loading && !data ? "—" : value.toLocaleString()}</p><p className="text-xs text-slate-500 dark:text-slate-400">{label}</p></div></div>)}
    </section>

    <section className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><ServerStackIcon className="h-5 w-5 text-blue-500" /><h3 className="font-semibold text-slate-900 dark:text-slate-100">API Health</h3></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${apiHealth?.status === "HEALTHY" ? "bg-emerald-500/10 text-emerald-500" : apiHealth?.status === "DEGRADED" ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500"}`}>{apiHealth?.status ?? "UNKNOWN"}</span></div><div className="mt-4 grid grid-cols-3 gap-3 text-center"><div className="rounded-xl bg-emerald-500/10 p-3"><p className="text-lg font-bold text-emerald-500">{apiHealth ? `${apiHealth.availabilityPercent}%` : "—"}</p><p className="text-[11px] text-slate-500">Availability</p></div><div className="rounded-xl bg-blue-500/10 p-3"><p className="text-lg font-bold text-blue-500">{apiHealth ? `${apiHealth.averageResponseTimeMs} ms` : "—"}</p><p className="text-[11px] text-slate-500">Response Time</p></div><div className="rounded-xl bg-red-500/10 p-3"><p className="text-lg font-bold text-red-500">{apiHealth ? `${apiHealth.errorRatePercent}%` : "—"}</p><p className="text-[11px] text-slate-500">Error Rate</p></div></div><p className="mt-3 text-[10px] text-slate-400">Measured since the current API process started · {apiHealth?.totalRequests ?? 0} requests</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><h3 className="font-semibold text-slate-900 dark:text-slate-100">Recent Alerts</h3><button onClick={() => navigate("/invoice-alerts")} className="text-xs font-semibold text-orange-500 hover:text-orange-600">Manage alerts →</button></div><div className="mt-3 space-y-2">{!loading && !data?.recentAlerts.length && <p className="py-5 text-center text-sm text-slate-500">No recent invoice alerts.</p>}{data?.recentAlerts.slice(0, 3).map(alert => <button onClick={() => navigate("/invoice-alerts")} key={alert.id} className="flex w-full gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-left dark:bg-slate-800/60"><ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" /><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">{alert.client} · {alert.irn}</p><p className="truncate text-xs text-slate-500">{alert.message}</p></div><span className="ml-auto shrink-0 text-[10px] text-slate-400">{formatDate(alert.occurredAt)}</span></button>)}</div></div>
    </section>

    <section id="invoice-monitor" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="space-y-3 border-b border-slate-100 p-5 dark:border-slate-800"><div className="flex items-center justify-between"><h3 className="font-semibold text-slate-900 dark:text-slate-100">Invoice Monitor</h3><span className="text-xs text-slate-500">{data?.pagination.total.toLocaleString() ?? 0} records</span></div><div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_180px_160px_160px]">
        <label className="relative"><MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search IRN, customer or client…" className="h-10 w-full rounded-xl border border-slate-200 bg-transparent pl-10 pr-3 text-sm text-slate-800 outline-none focus:border-orange-500 dark:border-slate-700 dark:text-slate-200" /></label>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><option value="ALL">All statuses</option><option value="PENDING">Pending</option><option value="SUCCESSFUL">Successful</option><option value="FAILED">Failed</option><option value="REJECTED">Rejected</option></select>
        <input type="date" aria-label="Created from" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} className="h-10 rounded-xl border border-slate-200 bg-transparent px-3 text-sm text-slate-600 outline-none dark:border-slate-700 dark:text-slate-300" /><input type="date" aria-label="Created to" value={to} min={from || undefined} onChange={e => { setTo(e.target.value); setPage(1); }} className="h-10 rounded-xl border border-slate-200 bg-transparent px-3 text-sm text-slate-600 outline-none dark:border-slate-700 dark:text-slate-300" />
      </div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1180px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400"><tr>{["Invoice Number", "IRN", "Customer Name", "Current Status", "Created Date", "Last Updated", "Retries", "Error Reason", "Actions"].map(item => <th key={item} className="px-5 py-3.5">{item}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">
        {loading && !data && <tr><td colSpan={9} className="px-5 py-14 text-center text-slate-500">Loading invoice records…</td></tr>}{!loading && !data?.invoices.length && <tr><td colSpan={9} className="px-5 py-14 text-center text-slate-500">No invoices match the current filters.</td></tr>}
        {data?.invoices.map(invoice => <tr key={invoice.id} onClick={() => navigate(`/invoice-monitoring/${invoice.id}`)} className="cursor-pointer text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50"><td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-900 dark:text-slate-100">{invoice.invoiceNumber || "—"}</td><td className="max-w-52 truncate px-5 py-4 font-mono text-xs" title={invoice.irn}>{invoice.irn || "—"}</td><td className="max-w-52 px-5 py-4"><p className="truncate font-medium text-slate-800 dark:text-slate-200">{invoice.customerName}</p><p className="truncate text-xs text-slate-400">{invoice.client?.name ?? "Unknown client"}</p></td><td className="px-5 py-4"><span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[invoice.currentStatus] ?? statusStyles.UNKNOWN}`}>{invoice.currentStatus.charAt(0) + invoice.currentStatus.slice(1).toLowerCase()}</span></td><td className="whitespace-nowrap px-5 py-4 text-xs">{invoice.createdAt ? formatDate(invoice.createdAt) : "—"}</td><td className="whitespace-nowrap px-5 py-4 text-xs">{invoice.updatedAt ? formatDate(invoice.updatedAt) : "—"}</td><td className="px-5 py-4 text-center">{invoice.retryCount}</td><td className="max-w-64 truncate px-5 py-4 text-xs text-red-500" title={invoice.errorReason ?? undefined}>{invoice.errorReason ?? "—"}</td><td className="px-5 py-4">{canWrite && RETRYABLE_STATES.has(invoice.processingStatus) ? <button disabled={retryingId === invoice.id} onClick={e => { e.stopPropagation(); void retryInvoice(invoice); }} className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-2.5 py-1.5 text-xs font-semibold text-orange-600 transition hover:bg-orange-500/20 disabled:cursor-wait disabled:opacity-60 dark:text-orange-400">{retryingId === invoice.id ? "Retrying…" : "Retry"}</button> : <span className="text-xs text-slate-400">—</span>}</td></tr>)}
      </tbody></table></div>
      <footer className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-xs text-slate-500 dark:border-slate-800"><span>Page {data?.pagination.page ?? 1} of {Math.max(data?.pagination.totalPages ?? 1, 1)}</span><div className="flex gap-2"><button aria-label="Previous page" disabled={page <= 1 || loading} onClick={() => setPage(current => current - 1)} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40 dark:border-slate-700"><ChevronLeftIcon className="h-4 w-4" /></button><button aria-label="Next page" disabled={loading || page >= (data?.pagination.totalPages ?? 1)} onClick={() => setPage(current => current + 1)} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40 dark:border-slate-700"><ChevronRightIcon className="h-4 w-4" /></button></div></footer>
    </section>
  </div>;
}
