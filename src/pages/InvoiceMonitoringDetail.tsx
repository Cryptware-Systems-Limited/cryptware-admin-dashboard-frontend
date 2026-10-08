import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon, CheckIcon, ClockIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const RETRYABLE_STATES = new Set(["FAILED", "RETRY_PENDING", "VALIDATION_FAILED", "SIGNING_FAILED", "TRANSMISSION_FAILED"]);

interface DetailData {
  invoice: {
    id: string; invoiceNumber: string; irn: string; customerName: string; customerTin: string | null;
    client: { id: string; businessName: string }; currentStatus: string; processingStatus: string;
    paymentStatus: string; documentType: string; invoiceType: string; transactionCategory: string;
    issueDate: string; createdAt: string; updatedAt: string; amount: number; currency: string;
  };
  statusTimeline: Array<{ key: string; label: string; completed: boolean; current: boolean; timestamp: string | null }>;
  retryHistory: Array<{ id: string; attemptedAt: string; outcome: string; actor: string; action: string }>;
  retrySummary: { count: number; lastRetryAt: string | null };
  error: { message: string; firsStatus: string; processingStatus: string } | null;
  auditTrail: Array<{ id: string; action: string; resource: string; outcome: string; actor: string; occurredAt: string }>;
  createdBy: { id: string; fullName: string | null; email: string } | null;
}

const dateTime = (value: string | null) => value ? new Intl.DateTimeFormat("en-NG", {
  day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
}).format(new Date(value)) : "Not reached";
const label = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/^./, letter => letter.toUpperCase());

export default function InvoiceMonitoringDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canWrite } = useAuth();
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);

  const load = () => {
    if (!id) return Promise.resolve();
    return api.get<{ status: string; data: DetailData }>(`/api/invoices/${id}`)
      .then(response => { setData(response.data); setError(null); })
      .catch(reason => setError(reason instanceof Error ? reason.message : "Failed to load invoice"));
  };

  useEffect(() => {
    void load().finally(() => setLoading(false));
    // The invoice ID is the synchronization key for this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const retryInvoice = async () => {
    if (!id) return;
    setRetrying(true); setError(null); setRetryMessage(null);
    try {
      await api.post(`/api/invoices/${id}/retry`);
      setRetryMessage("Invoice was queued for retry.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Failed to retry invoice");
    } finally { setRetrying(false); }
  };

  if (loading) return <div className="py-24 text-center text-sm text-slate-500">Loading invoice detail…</div>;
  if (error || !data) return <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-500"><p>{error ?? "Invoice not found"}</p><button onClick={() => navigate("/invoice-monitoring")} className="mt-4 text-sm font-semibold">Back to monitoring</button></div>;
  const invoice = data.invoice;

  return <div className="space-y-5">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><button onClick={() => navigate("/invoice-monitoring")} className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-orange-500"><ArrowLeftIcon className="h-4 w-4" />Back to Invoice Monitoring</button><h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Invoice Detail</h2><p className="mt-1 font-mono text-xs text-slate-500">{invoice.irn}</p></div><div className="flex items-center gap-2"><span className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${invoice.currentStatus === "SUCCESSFUL" ? "bg-emerald-500/10 text-emerald-500" : invoice.currentStatus === "PENDING" ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500"}`}>{label(invoice.currentStatus)}</span>{canWrite && RETRYABLE_STATES.has(invoice.processingStatus) && <button disabled={retrying} onClick={() => void retryInvoice()} className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-wait disabled:opacity-60">{retrying ? "Retrying…" : "Retry invoice"}</button>}</div></header>

    {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</div>}
    {retryMessage && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">{retryMessage}</div>}

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h3 className="font-semibold text-slate-900 dark:text-slate-100">Invoice Information</h3><dl className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
      ["Invoice Number", invoice.invoiceNumber], ["IRN", invoice.irn], ["Customer Name", invoice.customerName], ["Customer TIN", invoice.customerTin ?? "—"],
      ["Client", invoice.client.businessName], ["Amount", `${invoice.currency} ${invoice.amount.toLocaleString()}`], ["Document Type", label(invoice.documentType)], ["Transaction", invoice.transactionCategory],
      ["Issue Date", dateTime(invoice.issueDate)], ["Created", dateTime(invoice.createdAt)], ["Last Updated", dateTime(invoice.updatedAt)], ["Processing Status", label(invoice.processingStatus)],
    ].map(([name, value]) => <div key={name} className="min-w-0"><dt className="text-[11px] uppercase tracking-wide text-slate-400">{name}</dt><dd className="mt-1 truncate text-sm font-medium text-slate-800 dark:text-slate-200" title={value}>{value}</dd></div>)}</dl></section>

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h3 className="font-semibold text-slate-900 dark:text-slate-100">Status Timeline</h3><div className="mt-5 grid gap-3 md:grid-cols-6">{data.statusTimeline.map((step, index) => <div key={step.key} className="relative"><div className={`flex h-9 w-9 items-center justify-center rounded-full border ${step.completed ? step.current ? "border-orange-500 bg-orange-500 text-white" : "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 text-slate-400 dark:border-slate-700"}`}>{step.completed ? <CheckIcon className="h-4 w-4" /> : <span className="text-xs">{index + 1}</span>}</div><p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">{step.label}</p><p className="mt-0.5 text-[10px] text-slate-400">{dateTime(step.timestamp)}</p></div>)}</div></section>

    <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><h3 className="font-semibold text-slate-900 dark:text-slate-100">Retry History</h3><span className="text-xs text-slate-500">{data.retrySummary.count} retries</span></div><div className="mt-4 space-y-2">{!data.retryHistory.length && <p className="py-8 text-center text-sm text-slate-500">No retry attempts recorded.</p>}{data.retryHistory.map(item => <div key={item.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"><ClockIcon className="h-4 w-4 text-blue-500" /><div><p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{label(item.action)}</p><p className="text-[11px] text-slate-400">{item.actor} · {dateTime(item.attemptedAt)}</p></div><span className={`ml-auto text-xs font-semibold ${item.outcome === "SUCCESS" ? "text-emerald-500" : "text-red-500"}`}>{item.outcome}</span></div>)}</div></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h3 className="font-semibold text-slate-900 dark:text-slate-100">Error Information</h3>{data.error ? <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4"><div className="flex gap-3"><ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-red-500" /><div><p className="text-sm text-red-600 dark:text-red-400">{data.error.message}</p><p className="mt-2 text-xs text-slate-500">FIRS: {data.error.firsStatus} · Processing: {label(data.error.processingStatus)}</p></div></div></div> : <div className="mt-4 rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-400">No error information recorded for this invoice.</div>}</section>
    </div>

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h3 className="font-semibold text-slate-900 dark:text-slate-100">Audit Trail</h3><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="text-[11px] uppercase text-slate-400"><tr><th className="pb-3">Action</th><th className="pb-3">Actor</th><th className="pb-3">Outcome</th><th className="pb-3">Date</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{!data.auditTrail.length && <tr><td colSpan={4} className="py-8 text-center text-slate-500">No matching audit events recorded.</td></tr>}{data.auditTrail.map(item => <tr key={item.id}><td className="py-3 font-medium text-slate-700 dark:text-slate-300">{label(item.action)}</td><td className="py-3 text-slate-500">{item.actor}</td><td className={`py-3 font-semibold ${item.outcome === "SUCCESS" ? "text-emerald-500" : "text-red-500"}`}>{item.outcome}</td><td className="py-3 text-xs text-slate-500">{dateTime(item.occurredAt)}</td></tr>)}</tbody></table></div></section>
  </div>;
}
