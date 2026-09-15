import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  NoSymbolIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type SubscriptionStatus = "ACTIVE" | "GRACE_PERIOD" | "EXPIRED" | "CANCELLED";
type PaymentStatus = "PAID" | "PENDING" | "OVERDUE" | "NOT_REQUIRED";
type ReminderStatus = "SENT" | "PENDING" | "NOT_SENT" | "FAILED";
type RenewalStatus = "SCHEDULED" | "COUNTDOWN" | "PAYMENT_DUE" | "GRACE_PERIOD";
type RenewalPreset = "" | "TODAY" | "NEXT_3" | "NEXT_7" | "NEXT_10" | "NEXT_30" | "CUSTOM";

interface SubscriptionRecord {
  id: string;
  organizationId: string;
  clientName: string;
  plan: string;
  amount: number;
  currency: string;
  subscriptionStatus: SubscriptionStatus;
  paymentStatus: PaymentStatus;
  subscriptionStartDate: string;
  lastRenewalDate: string;
  nextRenewalDate: string;
  renewalStatus: RenewalStatus;
  daysRemainingUntilRenewal: number;
  daysOverdue: number;
  gracePeriodStatus: "ACTIVE" | "EXPIRED" | "NOT_STARTED";
  gracePeriodEndDate: string | null;
  lastPaymentDate: string | null;
  paymentProvider: string | null;
  transactionReference: string | null;
  reminderStatus: ReminderStatus;
}

interface SubscriptionResponse {
  status: string;
  data: {
    records: SubscriptionRecord[];
    summary: {
      activeClients: number;
      cancelled: number;
      renewingSoon: number;
      paymentDue: number;
      gracePeriod: number;
    };
    pagination: { total: number; page: number; limit: number; pages: number };
  };
}

interface SubscriptionDetails extends SubscriptionRecord {
  subscriptionReference: string;
  clientEmail: string;
  billingFrequency: "MONTHLY" | "ANNUAL";
  currentCycleStartDate: string;
  gracePeriod: { status: "ACTIVE" | "EXPIRED"; startedAt: string; endsAt: string; daysOverdue: number } | null;
  paymentHistory: Array<{ id: string; status: string; provider: string | null; reference: string | null; amount: number | null; currency: string | null; paidAt: string }>;
  reminderHistory: Array<{ id: string; status: "SENT" | "PENDING" | "FAILED"; sentAt: string | null; scheduledFor: string | null; channel?: string | null; recipient?: string | null; error?: string | null }>;
}

const selectClass = "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300";

const subscriptionBadge: Record<SubscriptionStatus, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  GRACE_PERIOD: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  EXPIRED: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  CANCELLED: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
};

const paymentBadge: Record<PaymentStatus, string> = {
  PAID: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  PENDING: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  OVERDUE: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  NOT_REQUIRED: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
};

const reminderBadge: Record<ReminderStatus, string> = {
  SENT: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  PENDING: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  FAILED: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  NOT_SENT: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
};

function label(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800", className)} />;
}

function Field({ label: fieldLabel, value }: { label: string; value: React.ReactNode }) {
  return <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{fieldLabel}</dt><dd className="mt-1 break-words text-sm font-medium text-slate-800 dark:text-slate-200">{value ?? "—"}</dd></div>;
}

function RenewalTiming({ record }: { record: SubscriptionRecord }) {
  if (record.renewalStatus === "GRACE_PERIOD") {
    return <div><span className="inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-500">Grace Period</span><p className="mt-1 text-xs font-semibold text-red-500">{record.daysOverdue}d overdue</p><p className="mt-0.5 text-[10px] text-slate-400">Ends {formatDate(record.gracePeriodEndDate)}</p></div>;
  }
  if (record.renewalStatus === "PAYMENT_DUE") {
    return <div><span className="inline-flex rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-500">Payment Due</span><p className="mt-1 text-[10px] text-slate-400">Renewal is due today</p></div>;
  }
  if (record.renewalStatus === "COUNTDOWN") {
    return <div><p className="font-semibold text-amber-500">{record.daysRemainingUntilRenewal} {record.daysRemainingUntilRenewal === 1 ? "day" : "days"} remaining</p><p className="mt-0.5 text-[10px] text-slate-400">Renews {formatDate(record.nextRenewalDate)}</p></div>;
  }
  return <span className="text-slate-500">{formatDate(record.nextRenewalDate)}</span>;
}

export default function SubscriptionMonitoring() {
  const [records, setRecords] = useState<SubscriptionRecord[]>([]);
  const [summary, setSummary] = useState<SubscriptionResponse["data"]["summary"] | null>(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 25, pages: 0 });
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [reminderStatus, setReminderStatus] = useState("");
  const [renewalStatus, setRenewalStatus] = useState("");
  const [renewalPreset, setRenewalPreset] = useState<RenewalPreset>("");
  const [customFromMonth, setCustomFromMonth] = useState("");
  const [customToMonth, setCustomToMonth] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionDetails | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderActionMessage, setReminderActionMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const renewalRange = useMemo(() => {
    const isoDate = (date: Date) => date.toISOString().slice(0, 10);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (!renewalPreset) return {};
    if (renewalPreset === "CUSTOM") {
      if (!customFromMonth && !customToMonth) return {};
      const from = customFromMonth ? `${customFromMonth}-01` : undefined;
      let to: string | undefined;
      if (customToMonth) {
        const [year, month] = customToMonth.split("-").map(Number);
        to = isoDate(new Date(Date.UTC(year, month, 0)));
      }
      return { from, to };
    }
    const days = renewalPreset === "TODAY" ? 0 : Number(renewalPreset.replace("NEXT_", ""));
    const end = new Date(today);
    end.setUTCDate(end.getUTCDate() + days);
    return { from: isoDate(today), to: isoDate(end) };
  }, [customFromMonth, customToMonth, renewalPreset]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: "25" });
    if (search) params.set("search", search);
    if (plan) params.set("plan", plan);
    if (subscriptionStatus) params.set("subscriptionStatus", subscriptionStatus);
    if (paymentStatus) params.set("paymentStatus", paymentStatus);
    if (reminderStatus) params.set("reminderStatus", reminderStatus);
    if (renewalStatus) params.set("renewalStatus", renewalStatus);
    if (renewalRange.from) params.set("renewalFrom", renewalRange.from);
    if (renewalRange.to) params.set("renewalTo", renewalRange.to);
    return params.toString();
  }, [page, paymentStatus, plan, reminderStatus, renewalRange, renewalStatus, search, subscriptionStatus]);

  const loadSubscriptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<SubscriptionResponse>(`/admin/subscriptions?${queryString}`);
      setRecords(response.data.records);
      setSummary(response.data.summary);
      setPagination(response.data.pagination);
    } catch (requestError) {
      setRecords([]);
      setSummary(null);
      console.error("Unable to load subscriptions", requestError);
      setError("The subscription data is temporarily unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => { void loadSubscriptions(); }, [loadSubscriptions]);

  useEffect(() => {
    if (!detailsOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setDetailsOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [detailsOpen]);

  async function openDetails(id: string) {
    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsError(null);
    setReminderActionMessage(null);
    setSelectedSubscription(null);
    try {
      const response = await api.get<{ status: string; data: SubscriptionDetails }>(`/admin/subscriptions/${id}`);
      setSelectedSubscription(response.data);
    } catch (requestError) {
      console.error("Unable to load subscription details", requestError);
      setDetailsError("The subscription details are temporarily unavailable. Please try again.");
    } finally {
      setDetailsLoading(false);
    }
  }

  async function resendReminder() {
    if (!selectedSubscription || sendingReminder) return;
    const subscriptionId = selectedSubscription.id;
    setSendingReminder(true);
    setReminderActionMessage(null);
    try {
      await api.post(`/admin/subscriptions/${subscriptionId}/reminders`, {});
      await openDetails(subscriptionId);
      setReminderActionMessage("Reminder sent and recorded successfully.");
      void loadSubscriptions();
    } catch (requestError) {
      console.error("Unable to send subscription reminder", requestError);
      setReminderActionMessage("The reminder could not be sent. Please try again.");
    } finally {
      setSendingReminder(false);
    }
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setPlan("");
    setSubscriptionStatus("");
    setPaymentStatus("");
    setReminderStatus("");
    setRenewalStatus("");
    setRenewalPreset("");
    setCustomFromMonth("");
    setCustomToMonth("");
    setPage(1);
  }

  function applyHealthCard(card: "active" | "cancelled" | "renewing" | "payment" | "grace") {
    setSubscriptionStatus(card === "active" ? "ACTIVE" : card === "cancelled" ? "CANCELLED" : "");
    setRenewalStatus(card === "renewing" ? "COUNTDOWN" : card === "payment" ? "PAYMENT_DUE" : card === "grace" ? "GRACE_PERIOD" : "");
    setPage(1);
  }

  async function exportCsv() {
    if (exporting) return;
    setExporting(true);
    try {
      const { blob } = await api.download(`/admin/subscriptions/export?${queryString}`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `subscription-monitoring-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      console.error("Unable to export subscriptions", requestError);
      setError("The subscription export is temporarily unavailable. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  const cards = [
    { id: "active" as const, label: "Active Clients", value: summary?.activeClients, icon: CheckCircleIcon, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { id: "cancelled" as const, label: "Cancelled", value: summary?.cancelled, icon: NoSymbolIcon, color: "text-slate-500", bg: "bg-slate-500/10" },
    { id: "renewing" as const, label: "Renewing Soon", value: summary?.renewingSoon, icon: CalendarDaysIcon, color: "text-blue-500", bg: "bg-blue-500/10" },
    { id: "payment" as const, label: "Payment Due", value: summary?.paymentDue, icon: BanknotesIcon, color: "text-red-500", bg: "bg-red-500/10" },
    { id: "grace" as const, label: "Grace Period", value: summary?.gracePeriod, icon: ClockIcon, color: "text-amber-500", bg: "bg-amber-500/10" },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">Pricing &amp; Billing</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">Subscription Monitoring</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Monitor client plans, renewals, payments, and grace periods.</p>
        </div>
        <button onClick={() => void exportCsv()} disabled={!pagination.total || loading || exporting} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-semibold text-white shadow-lg shadow-orange-600/20 transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-40">
          {exporting ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <ArrowDownTrayIcon className="h-4 w-4" />} {exporting ? "Exporting…" : "Export filtered results"}
        </button>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <button type="button" onClick={() => applyHealthCard(card.id)} key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-orange-500/30 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-orange-500/40" aria-label={`Filter by ${card.label}`}>
            <div className={cn("mb-3 flex h-9 w-9 items-center justify-center rounded-xl", card.bg)}><card.icon className={cn("h-5 w-5", card.color)} /></div>
            {loading ? <Skeleton className="mb-2 h-7 w-14" /> : <p className="text-2xl font-bold text-slate-900 dark:text-white">{card.value ?? 0}</p>}
            <p className="text-xs text-slate-500 dark:text-slate-400">{card.label}</p>
          </button>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="relative xl:col-span-2">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search client or reference..." className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200" />
          </label>
          <select value={plan} onChange={(event) => { setPlan(event.target.value); setPage(1); }} className={selectClass}><option value="">All plans</option><option value="free">Free</option><option value="basic">Basic</option><option value="professional">Professional</option><option value="enterprise">Enterprise</option></select>
          <select value={subscriptionStatus} onChange={(event) => { setSubscriptionStatus(event.target.value); setPage(1); }} className={selectClass}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="GRACE_PERIOD">Grace period</option><option value="EXPIRED">Expired</option><option value="CANCELLED">Cancelled</option></select>
          <select value={paymentStatus} onChange={(event) => { setPaymentStatus(event.target.value); setPage(1); }} className={selectClass}><option value="">All payments</option><option value="PAID">Paid</option><option value="PENDING">Pending</option><option value="OVERDUE">Overdue</option><option value="NOT_REQUIRED">Not required</option></select>
          <select value={reminderStatus} onChange={(event) => { setReminderStatus(event.target.value); setPage(1); }} className={selectClass}><option value="">All reminders</option><option value="SENT">Sent</option><option value="NOT_SENT">Not sent</option><option value="FAILED">Failed</option></select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select value={renewalPreset} onChange={(event) => { setRenewalPreset(event.target.value as RenewalPreset); setPage(1); }} className={selectClass} aria-label="Renewal date range"><option value="">All renewal dates</option><option value="TODAY">Today</option><option value="NEXT_3">Next 3 days</option><option value="NEXT_7">Next 7 days</option><option value="NEXT_10">Next 10 days</option><option value="NEXT_30">Next 30 days</option><option value="CUSTOM">Custom months</option></select>
          {renewalPreset === "CUSTOM" && <><input type="month" value={customFromMonth} onChange={(event) => { setCustomFromMonth(event.target.value); setPage(1); }} className={selectClass} aria-label="Renewal month from" /><span className="text-xs text-slate-400">to</span><input type="month" min={customFromMonth} value={customToMonth} onChange={(event) => { setCustomToMonth(event.target.value); setPage(1); }} className={selectClass} aria-label="Renewal month to" /></>}
          <button onClick={clearFilters} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Clear filters</button>
        </div>
      </section>

      {error ? (
        <section className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-500/20 dark:bg-red-500/10">
          <ExclamationTriangleIcon className="mb-3 h-9 w-9 text-red-500" /><h2 className="font-semibold text-red-700 dark:text-red-400">Subscriptions could not be loaded</h2><p className="mt-1 max-w-lg text-sm text-red-600/80 dark:text-red-400/80">{error}</p>
          <button onClick={() => void loadSubscriptions()} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 dark:border-red-500/30 dark:text-red-400"><ArrowPathIcon className="h-4 w-4" /> Try again</button>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800"><h2 className="font-semibold text-slate-900 dark:text-slate-100">Client subscriptions</h2><span className="text-xs text-slate-500">{pagination.total} records</span></div>
          <div className="overflow-x-auto">
            <table className="min-w-[1120px] w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950/60"><tr>{["Client", "Plan", "Amount", "Subscription", "Payment", "Renewal date", "Countdown", "Reminder", "Details"].map((heading) => <th key={heading} className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{heading}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? Array.from({ length: 6 }, (_, index) => <tr key={index}>{Array.from({ length: 9 }, (_, cell) => <td key={cell} className="px-5 py-4"><Skeleton className="h-4 w-full" /></td>)}</tr>) : records.map((record) => (
                  <tr key={record.id} tabIndex={0} onClick={() => void openDetails(record.id)} onKeyDown={(event) => { if (event.key === "Enter") void openDetails(record.id); }} className="cursor-pointer transition hover:bg-slate-50/80 focus:bg-orange-50/50 focus:outline-none dark:hover:bg-slate-800/40 dark:focus:bg-orange-500/5" aria-label={`View ${record.clientName} subscription details`}>
                    <td className="px-5 py-4"><p className="max-w-56 truncate font-semibold text-slate-900 dark:text-slate-100" title={record.clientName}>{record.clientName}</p><p className="mt-0.5 font-mono text-[10px] text-slate-400">{record.organizationId.slice(0, 12)}</p></td>
                    <td className="px-5 py-4 font-medium capitalize text-slate-700 dark:text-slate-300">{record.plan}</td>
                    <td className="px-5 py-4 font-semibold text-slate-800 dark:text-slate-200">{formatMoney(record.amount, record.currency)}</td>
                    <td className="px-5 py-4"><span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", subscriptionBadge[record.subscriptionStatus])}>{label(record.subscriptionStatus)}</span></td>
                    <td className="px-5 py-4"><span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", paymentBadge[record.paymentStatus])}>{label(record.paymentStatus)}</span></td>
                    <td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-400">{formatDate(record.nextRenewalDate)}</td>
                    <td className="px-5 py-4 text-xs"><RenewalTiming record={record} /></td>
                    <td className="px-5 py-4"><span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", reminderBadge[record.reminderStatus])}>{label(record.reminderStatus)}</span></td>
                    <td className="px-5 py-4 text-xs font-semibold text-orange-600 dark:text-orange-400">View details</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && records.length === 0 && <div className="flex min-h-60 flex-col items-center justify-center px-6 text-center"><BanknotesIcon className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-700" /><h3 className="font-semibold text-slate-700 dark:text-slate-300">No subscriptions found</h3><p className="mt-1 text-sm text-slate-500">Try changing or clearing the current filters.</p></div>}
          {!loading && pagination.pages > 0 && <footer className="flex items-center justify-between border-t border-slate-100 px-5 py-4 dark:border-slate-800"><p className="text-xs text-slate-500">Page {pagination.page} of {pagination.pages}</p><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300">Previous</button><button disabled={page >= pagination.pages} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300">Next</button></div></footer>}
        </section>
      )}

      {detailsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Subscription details">
          <button type="button" className="absolute inset-0 cursor-default bg-slate-950/65 backdrop-blur-sm" onClick={() => setDetailsOpen(false)} aria-label="Close subscription details" />
          <aside className="relative flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <header className="flex items-start justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-500">Subscription details</p><h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{selectedSubscription?.clientName ?? "Loading subscription…"}</h2>{selectedSubscription && <p className="mt-1 text-sm text-slate-500">{selectedSubscription.clientEmail}</p>}</div>
              <button type="button" onClick={() => setDetailsOpen(false)} className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800" aria-label="Close"><XMarkIcon className="h-5 w-5" /></button>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {detailsLoading ? <div className="space-y-4">{Array.from({ length: 7 }, (_, index) => <Skeleton key={index} className={cn("h-16", index === 0 && "h-28")} />)}</div> : detailsError ? (
                <div className="flex min-h-64 flex-col items-center justify-center text-center"><ExclamationTriangleIcon className="h-9 w-9 text-red-500" /><p className="mt-3 font-semibold text-red-500">Details could not be loaded</p><p className="mt-1 text-sm text-slate-500">{detailsError}</p></div>
              ) : selectedSubscription && (
                <div className="space-y-5">
                  <section className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
                    <div className="mb-5 flex flex-wrap gap-2"><span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", subscriptionBadge[selectedSubscription.subscriptionStatus])}>{label(selectedSubscription.subscriptionStatus)}</span><span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", paymentBadge[selectedSubscription.paymentStatus])}>{label(selectedSubscription.paymentStatus)}</span></div>
                    <dl className="grid gap-5 sm:grid-cols-2"><Field label="Subscription reference" value={<span className="font-mono text-xs">{selectedSubscription.subscriptionReference}</span>} /><Field label="Plan" value={label(selectedSubscription.plan)} /><Field label="Amount" value={formatMoney(selectedSubscription.amount, selectedSubscription.currency)} /><Field label="Billing frequency" value={label(selectedSubscription.billingFrequency)} /><Field label="Subscription start" value={formatDate(selectedSubscription.subscriptionStartDate)} /><Field label="Current cycle start" value={formatDate(selectedSubscription.currentCycleStartDate)} /></dl>
                  </section>

                  <section className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700"><h3 className="mb-4 font-semibold text-slate-900 dark:text-white">Payment information</h3><dl className="grid gap-5 sm:grid-cols-2"><Field label="Payment status" value={label(selectedSubscription.paymentStatus)} /><Field label="Last payment" value={formatDate(selectedSubscription.lastPaymentDate)} /><Field label="Payment provider" value={selectedSubscription.paymentProvider ? label(selectedSubscription.paymentProvider) : "—"} /><Field label="Transaction reference" value={<span className="font-mono text-xs">{selectedSubscription.transactionReference ?? "—"}</span>} /></dl></section>

                  <section className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700"><h3 className="mb-4 font-semibold text-slate-900 dark:text-white">Renewal information</h3><dl className="grid gap-5 sm:grid-cols-2"><Field label="Last renewal" value={formatDate(selectedSubscription.lastRenewalDate)} /><Field label="Next renewal" value={formatDate(selectedSubscription.nextRenewalDate)} /><Field label="Renewal status" value={label(selectedSubscription.renewalStatus)} /><Field label="Countdown" value={selectedSubscription.daysOverdue > 0 ? `${selectedSubscription.daysOverdue} days overdue` : `${selectedSubscription.daysRemainingUntilRenewal} days remaining`} /></dl></section>

                  {selectedSubscription.gracePeriod && <section className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5"><h3 className="mb-4 font-semibold text-amber-600 dark:text-amber-400">Grace period</h3><dl className="grid gap-5 sm:grid-cols-2"><Field label="Status" value={label(selectedSubscription.gracePeriod.status)} /><Field label="Days overdue" value={selectedSubscription.gracePeriod.daysOverdue} /><Field label="Started" value={formatDate(selectedSubscription.gracePeriod.startedAt)} /><Field label="Ends" value={formatDate(selectedSubscription.gracePeriod.endsAt)} /></dl></section>}

                  <section className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
                    <div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold text-slate-900 dark:text-white">Reminder history</h3><p className="mt-1 text-xs text-slate-500">Newest activity appears first.</p></div><button type="button" onClick={() => void resendReminder()} disabled={sendingReminder} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-orange-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50">{sendingReminder && <ArrowPathIcon className="h-4 w-4 animate-spin" />}{sendingReminder ? "Sending…" : "Resend reminder"}</button></div>
                    {reminderActionMessage && <p className={cn("mt-3 rounded-xl px-3 py-2 text-xs", reminderActionMessage.includes("successfully") ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-600 dark:text-red-400")}>{reminderActionMessage}</p>}
                    {selectedSubscription.reminderHistory.length === 0 ? <div className="mt-4 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 dark:bg-slate-950/50">No reminders have been recorded yet.</div> : <ol className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">{selectedSubscription.reminderHistory.map((reminder) => <li key={reminder.id} className="flex items-start justify-between gap-4 py-4"><div><p className="text-sm font-medium text-slate-800 dark:text-slate-200">{reminder.channel ? `${label(reminder.channel)} reminder` : "Subscription reminder"}</p><p className="mt-1 text-xs text-slate-500">{formatDate(reminder.sentAt ?? reminder.scheduledFor)}{reminder.recipient ? ` · ${reminder.recipient}` : ""}</p>{reminder.error && <p className="mt-1 text-xs text-red-500">{reminder.error}</p>}</div><span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", reminderBadge[reminder.status])}>{label(reminder.status)}</span></li>)}</ol>}
                  </section>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
