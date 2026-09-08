import { useCallback, useEffect, useState } from "react";
import { ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";

interface AuditLog {
  id: string;
  action: string;
  resource: string;
  module: string;
  outcome: "SUCCESS" | "FAILED";
  createdAt: string;
  actor: { id: string; fullName: string | null; email: string; role: string } | null;
}
interface AuditResponse {
  status: string;
  data: {
    logs: AuditLog[];
    modules: string[];
    actors: { id: string; fullName: string | null; email: string }[];
    actions: string[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
}

function readableAction(action: string) {
  return action.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export default function AuditLogPanel() {
  const [urlParams, setUrlParams] = useSearchParams();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [page, setPage] = useState(() => Number(urlParams.get("auditPage")) || 1);
  const [search, setSearch] = useState(() => urlParams.get("auditSearch") || "");
  const [module, setModule] = useState(() => urlParams.get("auditModule") || "All");
  const [period, setPeriod] = useState(() => urlParams.get("auditPeriod") || "all");
  const [from, setFrom] = useState(() => urlParams.get("auditFrom") || "");
  const [to, setTo] = useState(() => urlParams.get("auditTo") || "");
  const [outcome, setOutcome] = useState(() => urlParams.get("auditOutcome") || "All");
  const [actorId, setActorId] = useState(() => urlParams.get("auditActor") || "All");
  const [action, setAction] = useState(() => urlParams.get("auditAction") || "All");
  const [actors, setActors] = useState<AuditResponse["data"]["actors"]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "25" });
    if (search.trim()) params.set("search", search.trim());
    if (module !== "All") params.set("module", module);
    if (period !== "all") params.set("period", period);
    if (period === "custom" && from) params.set("from", from);
    if (period === "custom" && to) params.set("to", to);
    if (outcome !== "All") params.set("outcome", outcome);
    if (actorId !== "All") params.set("actorId", actorId);
    if (action !== "All") params.set("action", action);
    try {
      const result = await api.get<AuditResponse>(`/admin/audit-logs?${params}`);
      setLogs(result.data.logs); setModules(result.data.modules); setActors(result.data.actors); setActions(result.data.actions); setPagination(result.data.pagination);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to load audit logs"); }
    finally { setLoading(false); }
  }, [action, actorId, from, module, outcome, page, period, search, to]);

  useEffect(() => {
    const next = new URLSearchParams(urlParams);
    const values: Record<string, string> = { auditPage: String(page), auditSearch: search, auditModule: module, auditPeriod: period, auditFrom: from, auditTo: to, auditOutcome: outcome, auditActor: actorId, auditAction: action };
    Object.entries(values).forEach(([key, value]) => {
      if (!value || value === "All" || value === "all" || (key === "auditPage" && value === "1")) next.delete(key);
      else next.set(key, value);
    });
    if (next.toString() !== urlParams.toString()) setUrlParams(next, { replace: true });
  }, [action, actorId, from, module, outcome, page, period, search, setUrlParams, to, urlParams]);

  const clearFilters = () => {
    setSearch(""); setModule("All"); setPeriod("all"); setFrom(""); setTo("");
    setOutcome("All"); setActorId("All"); setAction("All"); setPage(1);
  };

  const hasFilters = Boolean(search.trim() || module !== "All" || period !== "all" || outcome !== "All" || actorId !== "All" || action !== "All");

  useEffect(() => { const timer = window.setTimeout(() => void load(), 250); return () => window.clearTimeout(timer); }, [load]);

  return (
    <div className="mt-7 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="relative flex-1"><MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search user, action, or resource" className="w-full rounded-xl border border-slate-200 bg-transparent py-2.5 pl-9 pr-3 text-sm outline-none focus:border-orange-500 dark:border-slate-700"/></div>
        <select aria-label="Filter by module" value={module} onChange={(event) => { setModule(event.target.value); setPage(1); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"><option>All</option>{modules.map((value) => <option key={value}>{value}</option>)}</select>
        <select aria-label="Filter by action type" value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"><option value="All">All actions</option>{actions.map((value) => <option key={value} value={value}>{readableAction(value)}</option>)}</select>
        <select aria-label="Filter by date" value={period} onChange={(event) => { setPeriod(event.target.value); setPage(1); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"><option value="all">All time</option><option value="today">Today</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="custom">Custom range</option></select>
        <select aria-label="Filter by outcome" value={outcome} onChange={(event) => { setOutcome(event.target.value); setPage(1); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"><option>All</option><option value="SUCCESS">Successful</option><option value="FAILED">Failed</option></select>
        <select aria-label="Filter by administrator" value={actorId} onChange={(event) => { setActorId(event.target.value); setPage(1); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"><option value="All">All administrators</option>{actors.map((actor) => <option key={actor.id} value={actor.id}>{actor.fullName || actor.email}</option>)}</select>
      </div>
      {(period === "custom" || hasFilters) && <div className="flex flex-wrap items-end gap-3">{period === "custom" && <><label className="text-xs text-slate-500">From<input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"/></label><label className="text-xs text-slate-500">To<input type="date" value={to} min={from || undefined} onChange={(event) => { setTo(event.target.value); setPage(1); }} className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"/></label></>} {hasFilters && <button type="button" onClick={clearFilters} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:border-orange-400 hover:text-orange-500 dark:border-slate-700 dark:text-slate-300">Clear filters</button>}</div>}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-950/50"><tr><th className="px-4 py-3">Timestamp</th><th className="px-4 py-3">User</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Module</th><th className="px-4 py-3">Outcome</th></tr></thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {loading ? <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500"><ArrowPathIcon className="mx-auto mb-2 h-5 w-5 animate-spin"/>Loading audit logs...</td></tr> : logs.length === 0 ? <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">No audit events match your search.</td></tr> : logs.map((log) => (
              <tr key={log.id} className="align-top hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{new Date(log.createdAt).toLocaleString("en-GB")}</td>
                <td className="px-4 py-3"><p className="font-semibold text-slate-900 dark:text-white">{log.actor?.fullName || log.actor?.email || "System"}</p>{log.actor?.fullName && <p className="text-xs text-slate-500">{log.actor.email}</p>}</td>
                <td className="px-4 py-3"><p className="font-semibold text-slate-800 dark:text-slate-200">{readableAction(log.action)}</p><p className="mt-1 max-w-xs truncate text-xs text-slate-500" title={log.resource}>{log.resource}</p></td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{log.module}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${log.outcome === "SUCCESS" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"}`}>{log.outcome === "SUCCESS" ? "Successful" : "Failed"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500"><span>{pagination.total} logged events</span><div className="flex items-center gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40 dark:border-slate-700"><ChevronLeftIcon className="h-4 w-4"/></button><span>Page {pagination.page} of {Math.max(pagination.totalPages, 1)}</span><button disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40 dark:border-slate-700"><ChevronRightIcon className="h-4 w-4"/></button></div></div>
    </div>
  );
}
