import { useCallback, useEffect, useState } from "react";
import { ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { api } from "@/lib/api";

interface User { id: string; fullName: string | null; email: string }
interface Alert {
  id: string; irn: string; title: string; message: string; client: string; customerName: string;
  severity: "HIGH" | "CRITICAL"; status: "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
  assignedUser: User | null; resolutionNotes: string | null; retryCount: number;
  occurredAt: string; updatedAt: string;
}
interface AlertList { alerts: Alert[]; users: User[]; stats: { active: number; acknowledged: number; resolved: number; critical: number }; pagination: { total: number } }
interface AlertDetail { alert: Alert; users: User[]; history: Array<{ id: string; action: string; outcome: string; metadata: unknown; createdAt: string; actor: (User & { name: string }) | null }> }
const dateTime = (value: string) => new Intl.DateTimeFormat("en-NG", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const display = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/^./, letter => letter.toUpperCase());

export default function AlertManagement() {
  const [data, setData] = useState<AlertList | null>(null);
  const [selected, setSelected] = useState<AlertDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState(""); const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null); const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const params = new URLSearchParams(); if (search) params.set("search", search); if (status !== "ALL") params.set("status", status); const result = await api.get<{ status: string; data: AlertList }>(`/admin/invoice-alerts?${params}`); setData(result.data); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Failed to load alerts"); }
    finally { setLoading(false); }
  }, [search, status]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 300); return () => window.clearTimeout(timer); }, [load]);

  const openAlert = async (alertOrId: Alert | string) => {
    const alert = typeof alertOrId === "string" ? data?.alerts.find(item => item.id === alertOrId) : alertOrId;
    if (!alert) return;
    setSelected({ alert, users: data?.users ?? [], history: [] });
    setNotes(alert.resolutionNotes ?? ""); setDetailLoading(true); setError(null);
    try { const result = await api.get<{ status: string; data: AlertDetail }>(`/admin/invoice-alerts/${alert.id}`); setSelected(result.data); setNotes(result.data.alert.resolutionNotes ?? ""); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Failed to load alert details"); }
    finally { setDetailLoading(false); }
  };
  const update = async (input: { status?: string; assignedUserId?: string | null; resolutionNotes?: string }) => {
    if (!selected) return; setSaving(true); setError(null);
    try { const result = await api.patch<{ status: string; data: AlertDetail }>(`/admin/invoice-alerts/${selected.alert.id}`, input); setSelected(result.data); setNotes(result.data.alert.resolutionNotes ?? ""); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Failed to update alert"); }
    finally { setSaving(false); }
  };
  const stats = data?.stats ?? { active: 0, acknowledged: 0, resolved: 0, critical: 0 };

  return <div className="space-y-5">
    <header><h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Alert Management</h2><p className="mt-0.5 text-sm text-slate-500">Monitor, assign, acknowledge and resolve invoice alerts</p></header>
    {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</div>}
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[["Active", stats.active, "text-red-500"], ["Acknowledged", stats.acknowledged, "text-amber-500"], ["Resolved", stats.resolved, "text-emerald-500"], ["Critical", stats.critical, "text-rose-500"]].map(([name, value, tone]) => <div key={String(name)} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><p className={`text-2xl font-bold ${tone}`}>{value}</p><p className="text-xs text-slate-500">{name}</p></div>)}</section>
    {detailLoading && <div className="flex items-center justify-end gap-2 text-xs font-medium text-orange-500"><ArrowPathIcon className="h-4 w-4 animate-spin"/>Loading selected alert details…</div>}
    <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-[1fr_180px] dark:border-slate-800"><label className="relative"><MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search IRN, client or customer…" className="h-10 w-full rounded-xl border border-slate-200 bg-transparent pl-10 pr-3 text-sm outline-none dark:border-slate-700"/></label><select value={status} onChange={event => setStatus(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700"><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="ACKNOWLEDGED">Acknowledged</option><option value="RESOLVED">Resolved</option></select></div><div className="divide-y divide-slate-100 dark:divide-slate-800">{loading && <p className="p-10 text-center text-sm text-slate-500">Loading alerts…</p>}{!loading && !data?.alerts.length && <p className="p-10 text-center text-sm text-slate-500">No alerts match the current filters.</p>}{data?.alerts.map(alert => <button key={alert.id} onClick={() => void openAlert(alert.id)} className={`flex w-full gap-3 p-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60 ${selected?.alert.id === alert.id ? "bg-orange-500/5" : ""}`}><ExclamationTriangleIcon className={`mt-0.5 h-5 w-5 shrink-0 ${alert.severity === "CRITICAL" ? "text-red-500" : "text-amber-500"}`}/><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">{alert.title} · {alert.irn}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${alert.status === "ACTIVE" ? "bg-red-500/10 text-red-500" : alert.status === "ACKNOWLEDGED" ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"}`}>{display(alert.status)}</span></div><p className="mt-1 truncate text-xs text-slate-500">{alert.client} · {alert.message}</p><p className="mt-1 text-[10px] text-slate-400">{dateTime(alert.occurredAt)} · {alert.assignedUser?.fullName ?? alert.assignedUser?.email ?? "Unassigned"}</p></div></button>)}</div></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">{!selected ? <div className="flex min-h-80 items-center justify-center text-center text-sm text-slate-500">Select an alert to view details and manage it.</div> : <div className="space-y-5"><div><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-900 dark:text-slate-100">{selected.alert.title}</h3><p className="font-mono text-xs text-slate-500">{selected.alert.irn}</p></div><span className="rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-500">{selected.alert.severity}</span></div><p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">{selected.alert.message}</p></div><label className="block text-xs font-semibold text-slate-500">Assigned User<select value={selected.alert.assignedUser?.id ?? ""} onChange={event => void update({ assignedUserId: event.target.value || null })} disabled={saving} className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-700"><option value="">Unassigned</option>{selected.users.map(user => <option key={user.id} value={user.id}>{user.fullName ?? user.email}</option>)}</select></label><label className="block text-xs font-semibold text-slate-500">Resolution Notes<textarea value={notes} onChange={event => setNotes(event.target.value)} rows={4} placeholder="Add investigation or resolution notes…" className="mt-2 w-full rounded-xl border border-slate-200 bg-transparent p-3 text-sm outline-none dark:border-slate-700"/></label><div className="flex gap-2">{selected.alert.status === "ACTIVE" && <button disabled={saving} onClick={() => void update({ status: "ACKNOWLEDGED", assignedUserId: selected.alert.assignedUser?.id })} className="flex-1 rounded-xl bg-amber-500 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Acknowledge</button>}<button disabled={saving || !notes.trim()} onClick={() => void update({ status: "RESOLVED", resolutionNotes: notes, assignedUserId: selected.alert.assignedUser?.id })} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-40"><CheckCircleIcon className="h-4 w-4"/>Resolve</button></div><div><h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Alert History</h4><div className="mt-3 space-y-2">{!selected.history.length && <p className="text-xs text-slate-500">No management activity yet.</p>}{selected.history.map(event => <div key={event.id} className="border-l-2 border-slate-200 pl-3 dark:border-slate-700"><p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{display(event.action)}</p><p className="text-[10px] text-slate-400">{event.actor?.name ?? "System"} · {dateTime(event.createdAt)}</p></div>)}</div></div></div>}</section>
    </div>
  </div>;
}
