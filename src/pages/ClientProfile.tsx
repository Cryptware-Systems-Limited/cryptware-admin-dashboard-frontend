import { useState, useEffect } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  BuildingOfficeIcon,
  WrenchScrewdriverIcon,
  ComputerDesktopIcon,
  ChartBarIcon,
  ShieldExclamationIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  MapPinIcon,
  TagIcon,
  LockClosedIcon,
  KeyIcon,
  UserGroupIcon,
  CreditCardIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { MOCK_CLIENTS, type Client, type ProjectStatus, type RAGStatus } from "@/data/clients";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

// ── API Types ─────────────────────────────────────────────────────────────────
interface ClientProfileData {
  overview: {
    id: string;
    businessName: string;
    tin: string;
    email: string;
    sector: string | null;
    telephone: string | null;
    businessDescription: string | null;
    address: {
      streetName?: string | null;
      cityName?: string | null;
      state?: string | null;
      country?: string | null;
      postalZone?: string | null;
      zipCode?: string | null;
    } | null;
    status: "Active" | "Suspended" | "Inactive Warning";
    onboardingDate: string;
    suspendedAt: string | null;
    inactivityWarningAt: string | null;
    serviceCategory: "DASHBOARD" | "ERP" | "BOTH";
    credentialEnvironment: "TEST" | "PROD" | "BOTH";
    dashboardAccessEnabled: boolean;
    apiAccessEnabled: boolean;
  };
  invoiceStats: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    byStatus: { pending: number; synced: number; failed: number; syncing: number };
    totalValue: number;
    thisMonthValue: number;
  };
  apiUsage: {
    totalKeys: number;
    activeKeys: number;
    lastActivity: string | null;
    keys: { id: string; isActive: boolean; lastUsedAt: string | null; createdAt: string; scopes: string[] }[];
  };
  users: { id: string; email: string; role: string; isActive: boolean; lastLoginAt: string | null }[];
  subscription: {
    status: string;
    plan: string;
    cycleStart: string;
    cycleEnd: string;
    usage: {
      invoices: { used: number; limit: number | null };
      creditDebit: { used: number; limit: number | null };
      apiCallsPerDay: number | null;
    };
    webhookEnabled: boolean;
    priceNgn: number;
  } | null;
}

// ── Activity Feed Types ───────────────────────────────────────────────────────
interface ActivityInvoice {
  id: string;
  irn: string;
  issueDate: string;
  createdAt: string;
  documentType: string;
  invoiceType: string;
  transactionCategory: string;
  firsStatus: string;
  status: string;
  payableAmount: number;
  retryCount: number;
  customer: { name: string; tin: string } | null;
}

interface ActivityData {
  invoices: ActivityInvoice[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const AVATAR_COLORS: [string, string][] = [
  ["#f97316", "#ef4444"],
  ["#3b82f6", "#6366f1"],
  ["#22c55e", "#10b981"],
  ["#a855f7", "#8b5cf6"],
  ["#ec4899", "#f43f5e"],
  ["#14b8a6", "#06b6d4"],
  ["#f59e0b", "#f97316"],
  ["#0ea5e9", "#3b82f6"],
];
function avatarGradient(name: string) {
  const [from, to] = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  return { background: `linear-gradient(135deg, ${from}, ${to})` };
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatNGN(n: number) {
  if (n === 0) return "₦0.00";
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 }).format(n);
}

const STATUS_BADGE: Record<ProjectStatus, string> = {
  Live:          "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20",
  "In Progress": "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20",
  Blocked:       "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20",
  "Not Started": "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700",
};

const ACCOUNT_BADGE: Record<string, string> = {
  "Active":           "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20",
  "Suspended":        "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20",
  "Inactive Warning": "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20",
  "Deleted":          "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700",
};

const FIRS_BADGE: Record<string, string> = {
  SYNCED:  "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
  PENDING: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
  SYNCING: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20",
  FAILED:  "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20",
};

const ACCOUNT_DOT: Record<string, string> = {
  "Active":           "bg-emerald-500",
  "Suspended":        "bg-red-500",
  "Inactive Warning": "bg-amber-400",
  "Deleted":          "bg-slate-400",
};

const RAG_CONFIG: Record<RAGStatus, { dot: string; text: string; label: string }> = {
  GREEN:   { dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", label: "On Track" },
  AMBER:   { dot: "bg-amber-400",   text: "text-amber-600 dark:text-amber-400",     label: "At Risk" },
  RED:     { dot: "bg-red-500",     text: "text-red-600 dark:text-red-400",         label: "Critical" },
  PENDING: { dot: "bg-slate-400",   text: "text-slate-500 dark:text-slate-400",     label: "No Kickoff" },
};

// ── Sub-components ─────────────────────────────────────────────────────────────
function SectionCard({ title, icon, children, accent = "orange" }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  accent?: "orange" | "blue" | "green" | "purple" | "red";
}) {
  const accentBar: Record<string, string> = {
    orange: "bg-orange-500",
    blue:   "bg-blue-500",
    green:  "bg-emerald-500",
    purple: "bg-violet-500",
    red:    "bg-red-500",
  };
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
        <div className={cn("w-0.5 h-4 rounded-full shrink-0", accentBar[accent])} />
        <span className="text-slate-400 dark:text-slate-500">{icon}</span>
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({ label, value, nrs, children }: {
  label: string;
  value?: string | null;
  nrs?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
        {label}
        {nrs && (
          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-500/20">
            NRS
          </span>
        )}
      </p>
      {children ?? (
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
          {value ?? <span className="text-slate-300 dark:text-slate-600 font-normal">—</span>}
        </p>
      )}
    </div>
  );
}

function EditableNote({ value, onSave, readOnly = false }: {
  value: string;
  onSave: (v: string) => void;
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function save() { onSave(draft); setEditing(false); }
  function cancel() { setDraft(value); setEditing(false); }

  if (readOnly || !editing) {
    return (
      <div className="flex items-start gap-2 group">
        <p className="text-sm text-slate-700 dark:text-slate-300 flex-1 leading-relaxed">
          {value || <span className="text-slate-300 dark:text-slate-600">No notes</span>}
        </p>
        {!readOnly && (
          <button
            onClick={() => setEditing(true)}
            className="shrink-0 p-1.5 rounded-md text-slate-300 dark:text-slate-600 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors opacity-0 group-hover:opacity-100"
          >
            <PencilIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <textarea
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={3}
        className="w-full px-3 py-2.5 text-sm border border-orange-300 dark:border-orange-500/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/30 resize-none text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800"
      />
      <div className="flex gap-2">
        <button onClick={save} className="flex items-center gap-1 px-3 py-1.5 bg-orange-600 text-white text-xs font-semibold rounded-lg hover:bg-orange-700 transition-colors active:scale-95">
          <CheckIcon className="w-3.5 h-3.5" /> Save
        </button>
        <button onClick={cancel} className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors active:scale-95">
          <XMarkIcon className="w-3.5 h-3.5" /> Cancel
        </button>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-5 max-w-5xl animate-pulse">
      <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded-lg" />
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 h-28" />
      <div className="grid grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800" />
        ))}
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-40 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800" />
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ClientProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo ?? "/clients";
  const { canWrite, canSuspend } = useAuth();

  // API-powered profile state (onboarded clients)
  const [apiProfile, setApiProfile] = useState<ClientProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Activity feed state
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityPage, setActivityPage] = useState(1);
  const [activityFirsFilter, setActivityFirsFilter] = useState<string>("All");
  const [activityDatePreset, setActivityDatePreset] = useState<"All" | "today" | "last_7_days" | "last_30_days" | "custom">("All");
  const [activityDateFrom, setActivityDateFrom] = useState<string>("");
  const [activityDateTo, setActivityDateTo] = useState<string>("");

  // Mock data fallback (internal CRM clients)
  const original = MOCK_CLIENTS.find((c) => c.id === id);
  const [client, setClient] = useState<Client | undefined>(original);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [suspendConfirmOpen, setSuspendConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setProfileLoading(false); return; }
    api.get<{ status: string; data: ClientProfileData }>(`/admin/clients/${id}/profile`)
      .then((res) => setApiProfile(res.data))
      .catch(() => { /* 404 or network error → fall back to mock data */ })
      .finally(() => setProfileLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || !apiProfile) return;
    setActivityLoading(true);
    const params = new URLSearchParams({ page: String(activityPage), limit: "20" });
    if (activityFirsFilter !== "All") params.set("firsStatus", activityFirsFilter);

    const toISO = (d: Date) => d.toISOString().split("T")[0];
    const today = toISO(new Date());
    if (activityDatePreset === "today") {
      params.set("from", today); params.set("to", today);
    } else if (activityDatePreset === "last_7_days") {
      params.set("from", toISO(new Date(Date.now() - 6 * 86400000))); params.set("to", today);
    } else if (activityDatePreset === "last_30_days") {
      params.set("from", toISO(new Date(Date.now() - 29 * 86400000))); params.set("to", today);
    } else if (activityDatePreset === "custom") {
      if (activityDateFrom) params.set("from", activityDateFrom);
      if (activityDateTo)   params.set("to", activityDateTo);
    }

    api.get<{ status: string; data: ActivityData }>(`/admin/clients/${id}/activity?${params}`)
      .then((res) => setActivity(res.data))
      .catch(() => {})
      .finally(() => setActivityLoading(false));
  }, [id, apiProfile, activityPage, activityFirsFilter, activityDatePreset, activityDateFrom, activityDateTo]);

  if (profileLoading) return <ProfileSkeleton />;

  // ── API-powered onboarded client profile ──────────────────────────────────
  if (apiProfile) {
    const ov = apiProfile.overview;
    const stats = apiProfile.invoiceStats;
    const usage = apiProfile.apiUsage;
    const sub = apiProfile.subscription;
    const isSuspended = ov.status === "Suspended";

    return (
      <div className="space-y-5 max-w-5xl">

        {/* Back */}
        <button
          onClick={() => navigate(returnTo)}
          className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-500 transition-colors active:scale-95"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Clients
        </button>

        {/* Hero */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="h-1.5 w-full" style={avatarGradient(ov.businessName)} />
          <div className="flex flex-wrap items-start gap-4 p-5">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-black shrink-0 shadow-lg"
              style={avatarGradient(ov.businessName)}
            >
              {ov.businessName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{ov.businessName}</h1>
                <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full", ACCOUNT_BADGE[ov.status])}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", ACCOUNT_DOT[ov.status])} />
                  {ov.status}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-mono">{ov.tin}</span>
                <span>{ov.email}</span>
                {ov.sector && <span>{ov.sector}</span>}
                <span className="flex items-center gap-1">
                  <TagIcon className="w-3.5 h-3.5" />
                  Onboarded {formatDate(ov.onboardingDate)}
                </span>
              </div>
            </div>
            {/* Quick stats */}
            <div className="flex items-center gap-5 px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
              <div className="text-center">
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
                  {stats.total.toLocaleString()}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Invoices</p>
              </div>
              <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
              <div className="text-center">
                <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                  {formatNGN(stats.totalValue)}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Total Value</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Organisation Overview ── */}
        <SectionCard title="Organisation Overview" icon={<BuildingOfficeIcon className="w-4 h-4" />} accent="blue">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            <Field label="Business Name" value={ov.businessName} />
            <Field label="TIN" value={ov.tin} />
            <Field label="Email" value={ov.email} />
            <Field label="Telephone" value={ov.telephone} />
            <Field label="Sector" value={ov.sector} />
            <Field label="Address">
              {ov.address ? (
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {[ov.address.streetName, ov.address.cityName, ov.address.state, ov.address.country]
                    .filter(Boolean)
                    .join(", ") || <span className="text-slate-300 dark:text-slate-600 font-normal">—</span>}
                </p>
              ) : (
                <span className="text-slate-300 dark:text-slate-600 font-normal text-sm">—</span>
              )}
            </Field>
            {ov.businessDescription && (
              <div className="col-span-2 sm:col-span-3">
                <Field label="Business Description" value={ov.businessDescription} />
              </div>
            )}
          </div>
        </SectionCard>

        {/* ── Invoice Statistics ── */}
        <SectionCard title="Invoice Statistics" icon={<ChartBarIcon className="w-4 h-4" />} accent="green">
          {/* Volume cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
            {[
              { label: "Total Invoices", value: stats.total,     borderColor: "border-t-slate-400",   numColor: "text-slate-900 dark:text-slate-100" },
              { label: "This Month",     value: stats.thisMonth, borderColor: "border-t-emerald-500", numColor: "text-emerald-700 dark:text-emerald-400" },
              { label: "Last Month",     value: stats.lastMonth, borderColor: "border-t-blue-500",    numColor: "text-blue-700 dark:text-blue-400" },
            ].map((card) => (
              <div key={card.label} className={cn("rounded-xl p-4 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 border-t-[3px]", card.borderColor)}>
                <p className={cn("text-3xl font-black tracking-tight", card.numColor)}>{card.value.toLocaleString()}</p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">{card.label}</p>
              </div>
            ))}
          </div>

          {/* By FIRS status */}
          <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">FIRS Status Breakdown</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { key: "synced",  label: "Synced",  value: stats.byStatus.synced,  numColor: "text-emerald-700 dark:text-emerald-400" },
              { key: "pending", label: "Pending", value: stats.byStatus.pending, numColor: "text-amber-700 dark:text-amber-400" },
              { key: "syncing", label: "Syncing", value: stats.byStatus.syncing, numColor: "text-blue-700 dark:text-blue-400" },
              { key: "failed",  label: "Failed",  value: stats.byStatus.failed,  numColor: "text-red-700 dark:text-red-400" },
            ].map((s) => (
              <div key={s.key} className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <p className={cn("text-2xl font-black", s.numColor)}>{s.value.toLocaleString()}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Values */}
          <div className="grid grid-cols-2 gap-5">
            <Field label="Total Invoice Value">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{formatNGN(stats.totalValue)}</p>
            </Field>
            <Field label="This Month Value">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{formatNGN(stats.thisMonthValue)}</p>
            </Field>
          </div>
        </SectionCard>

        {/* ── Recent Activity ── */}
        <SectionCard title="Recent Activity" icon={<ChartBarIcon className="w-4 h-4" />} accent="green">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {/* FIRS status */}
            <select
              value={activityFirsFilter}
              onChange={(e) => { setActivityFirsFilter(e.target.value); setActivityPage(1); }}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="SYNCED">Synced</option>
              <option value="PENDING">Pending</option>
              <option value="SYNCING">Syncing</option>
              <option value="FAILED">Failed</option>
            </select>

            {/* Date preset quick buttons */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
              {(["All", "today", "last_7_days", "last_30_days", "custom"] as const).map((preset) => (
                <button
                  key={preset}
                  onClick={() => { setActivityDatePreset(preset); setActivityPage(1); }}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
                    activityDatePreset === preset
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  {{ All: "All Time", today: "Today", last_7_days: "7 Days", last_30_days: "30 Days", custom: "Custom" }[preset]}
                </button>
              ))}
            </div>

            {/* Custom date inputs */}
            {activityDatePreset === "custom" && (
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={activityDateFrom}
                  onChange={(e) => { setActivityDateFrom(e.target.value); setActivityPage(1); }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition"
                />
                <span className="text-[11px] text-slate-400">to</span>
                <input
                  type="date"
                  value={activityDateTo}
                  onChange={(e) => { setActivityDateTo(e.target.value); setActivityPage(1); }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition"
                />
              </div>
            )}

            {activity && (
              <span className="ml-auto text-xs text-slate-400 dark:text-slate-500 font-medium">
                {activity.pagination.total.toLocaleString()} invoices
              </span>
            )}
          </div>

          {/* Table */}
          {activityLoading ? (
            <div className="space-y-2 animate-pulse">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-9 rounded-lg bg-slate-100 dark:bg-slate-800" />
              ))}
            </div>
          ) : !activity || activity.invoices.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 py-6 text-center">
              No invoice activity found.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      {["IRN", "Issue Date", "Type", "Customer", "Amount (NGN)", "FIRS Status", "Created"].map((h) => (
                        <th key={h} className="text-left pb-2.5 font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider pr-4 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {activity.invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 pr-4 font-mono text-slate-600 dark:text-slate-400 max-w-[140px] truncate" title={inv.irn}>
                          {inv.irn.slice(0, 20)}{inv.irn.length > 20 ? "…" : ""}
                        </td>
                        <td className="py-2.5 pr-4 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {formatDate(inv.issueDate)}
                        </td>
                        <td className="py-2.5 pr-4 whitespace-nowrap">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[10px]">
                            {inv.invoiceType}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-slate-700 dark:text-slate-300 max-w-[140px] truncate" title={inv.customer?.name}>
                          {inv.customer?.name ?? <span className="text-slate-300 dark:text-slate-600">—</span>}
                        </td>
                        <td className="py-2.5 pr-4 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap tabular-nums">
                          {inv.payableAmount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 pr-4 whitespace-nowrap">
                          <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold border", FIRS_BADGE[inv.firsStatus] ?? "bg-slate-100 text-slate-500")}>
                            {inv.firsStatus}
                          </span>
                        </td>
                        <td className="py-2.5 font-mono text-slate-400 dark:text-slate-500 whitespace-nowrap">
                          {formatDate(inv.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {activity.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Page {activity.pagination.page} of {activity.pagination.totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                      disabled={activityPage <= 1}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setActivityPage((p) => Math.min(activity.pagination.totalPages, p + 1))}
                      disabled={activityPage >= activity.pagination.totalPages}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </SectionCard>

        {/* ── API Usage ── */}
        <SectionCard title="API Usage" icon={<KeyIcon className="w-4 h-4" />} accent="blue">
          <div className="grid grid-cols-3 gap-5 mb-5">
            <Field label="Total API Keys">
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{usage.totalKeys}</p>
            </Field>
            <Field label="Active Keys">
              <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{usage.activeKeys}</p>
            </Field>
            <Field label="Last API Activity">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 font-mono">{formatDate(usage.lastActivity)}</p>
            </Field>
          </div>
          {usage.keys.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    {["Key ID", "Status", "Created", "Last Used", "Scopes"].map((h) => (
                      <th key={h} className="text-left pb-2.5 font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider pr-4">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {usage.keys.map((key) => (
                    <tr key={key.id}>
                      <td className="py-2.5 font-mono text-slate-600 dark:text-slate-400 pr-4">…{key.id.slice(-10)}</td>
                      <td className="py-2.5 pr-4">
                        <span className={cn("px-2 py-0.5 rounded-full font-semibold", key.isActive
                          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                        )}>
                          {key.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-2.5 font-mono text-slate-500 dark:text-slate-400 pr-4">{formatDate(key.createdAt)}</td>
                      <td className="py-2.5 font-mono text-slate-500 dark:text-slate-400 pr-4">{formatDate(key.lastUsedAt)}</td>
                      <td className="py-2.5 text-slate-500 dark:text-slate-400">{key.scopes.join(", ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        {/* ── Users ── */}
        <SectionCard title="Users" icon={<UserGroupIcon className="w-4 h-4" />} accent="purple">
          {apiProfile.users.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    {["Email", "Role", "Status", "Last Login"].map((h) => (
                      <th key={h} className="text-left pb-2.5 font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider pr-4">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {apiProfile.users.map((user) => (
                    <tr key={user.id}>
                      <td className="py-2.5 text-slate-700 dark:text-slate-300 pr-4">{user.email}</td>
                      <td className="py-2.5 pr-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                          {user.role}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className={cn("px-2 py-0.5 rounded-full font-semibold", user.isActive
                          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                        )}>
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-2.5 font-mono text-slate-500 dark:text-slate-400">{formatDate(user.lastLoginAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        {/* ── Subscription ── */}
        {sub && (
          <SectionCard title="Subscription" icon={<CreditCardIcon className="w-4 h-4" />} accent="orange">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 mb-5">
              <Field label="Plan">
                <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{sub.plan}</span>
              </Field>
              <Field label="Status">
                <span className={cn(
                  "text-xs font-semibold px-2.5 py-1 rounded-full border inline-block mt-0.5",
                  sub.status === "active"
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                    : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
                )}>
                  {sub.status}
                </span>
              </Field>
              <Field label="Price">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {formatNGN(sub.priceNgn)}
                  <span className="text-xs font-normal text-slate-400 dark:text-slate-500">/mo</span>
                </p>
              </Field>
              <Field label="Cycle Start">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 font-mono">{formatDate(sub.cycleStart)}</p>
              </Field>
              <Field label="Cycle End">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 font-mono">{formatDate(sub.cycleEnd)}</p>
              </Field>
              <Field label="Webhook">
                <span className={cn(
                  "text-xs font-semibold px-2.5 py-1 rounded-full border inline-block mt-0.5",
                  sub.webhookEnabled
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                )}>
                  {sub.webhookEnabled ? "Enabled" : "Disabled"}
                </span>
              </Field>
            </div>

            {/* Usage */}
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
              Usage This Cycle
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Invoices</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  {sub.usage.invoices.used.toLocaleString()}
                  {sub.usage.invoices.limit
                    ? ` / ${sub.usage.invoices.limit.toLocaleString()}`
                    : " (unlimited)"}
                </p>
                {sub.usage.invoices.limit && (
                  <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${Math.min((sub.usage.invoices.used / sub.usage.invoices.limit) * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Credit / Debit Notes</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  {sub.usage.creditDebit.used.toLocaleString()}
                  {sub.usage.creditDebit.limit
                    ? ` / ${sub.usage.creditDebit.limit.toLocaleString()}`
                    : " (unlimited)"}
                </p>
                {sub.usage.creditDebit.limit && (
                  <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${Math.min((sub.usage.creditDebit.used / sub.usage.creditDebit.limit) * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>
              <Field label="API Calls / Day">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {sub.usage.apiCallsPerDay ? sub.usage.apiCallsPerDay.toLocaleString() : "Unlimited"}
                </p>
              </Field>
            </div>
          </SectionCard>
        )}

        {/* ── Admin Controls ── */}
        <SectionCard title="Admin Controls" icon={<ShieldExclamationIcon className="w-4 h-4" />} accent="red">
          {!canWrite && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs">
              <LockClosedIcon className="w-3.5 h-3.5 shrink-0" />
              You have view-only access. Contact a System Admin to make changes.
            </div>
          )}
          {canSuspend && (
            <div className="space-y-3">
              {actionError && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-xs">
                  <ShieldExclamationIcon className="w-3.5 h-3.5 shrink-0" />
                  {actionError}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3">
                {isSuspended ? (
                  <button
                    disabled={actionLoading}
                    onClick={async () => {
                      setActionLoading(true);
                      setActionError(null);
                      try {
                        await api.post(`/admin/organizations/${id}/activate`);
                        setApiProfile((p) => p && { ...p, overview: { ...p.overview, status: "Active" } });
                      } catch (err) {
                        setActionError(err instanceof Error ? err.message : "Failed to activate client");
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 active:scale-95 transition-all shadow-sm shadow-emerald-600/20 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
                  >
                    {actionLoading ? "Activating…" : "Reactivate Client"}
                  </button>
                ) : (
                  <button
                    disabled={actionLoading}
                    onClick={() => { setActionError(null); setSuspendConfirmOpen(true); }}
                    className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 active:scale-95 transition-all shadow-sm shadow-red-600/20 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
                  >
                    {actionLoading ? "Suspending…" : "Suspend Client"}
                  </button>
                )}
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {isSuspended
                    ? "Client is suspended. Reactivating restores all platform access."
                    : "Suspending blocks all logins and API access for this organisation."}
                </p>
              </div>
              {isSuspended && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                  <ShieldExclamationIcon className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 dark:text-red-400">
                    This client is currently <strong>suspended</strong>. All users receive a 403 on login with instructions to contact{" "}
                    <span className="font-mono">support@cryptwaresystems.com</span>.
                  </p>
                </div>
              )}

              {/* Onboarding classification */}
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Onboarding Classification</p>
                {metaError && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-xs mb-3">
                    <ShieldExclamationIcon className="w-3.5 h-3.5 shrink-0" />
                    {metaError}
                  </div>
                )}
                <div className="space-y-5">
                  <div className="max-w-sm space-y-2">
                    <div>
                      <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">Service type</label>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Choose how this client connects to Cryptware.</p>
                    </div>
                    <select
                      disabled={metaLoading}
                      defaultValue={ov.serviceCategory}
                      onChange={async (e) => {
                        setMetaLoading(true); setMetaError(null);
                        try {
                          await api.patch(`/admin/organizations/${id}/onboarding-meta`, { serviceCategory: e.target.value });
                          setApiProfile((p) => p && { ...p, overview: { ...p.overview, serviceCategory: e.target.value as typeof ov.serviceCategory } });
                        } catch (err) {
                          setMetaError(err instanceof Error ? err.message : "Failed to update");
                        } finally { setMetaLoading(false); }
                      }}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition cursor-pointer disabled:opacity-50"
                    >
                      <option value="DASHBOARD">Dashboard only</option>
                      <option value="ERP">API only</option>
                      <option value="BOTH">Dashboard + API</option>
                    </select>
                  </div>
                  {ov.serviceCategory === "BOTH" && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950/30 p-4">
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Channel access</p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Turn each access channel on or off independently.</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                      {([
                        ["dashboardAccessEnabled", "Dashboard access", "Allow users to sign in and use the dashboard.", ov.dashboardAccessEnabled],
                        ["apiAccessEnabled", "API access", "Allow this organisation’s API keys to authenticate.", ov.apiAccessEnabled],
                      ] as const).map(([field, label, description, enabled]) => (
                        <button
                          key={field}
                          type="button"
                          role="switch"
                          aria-checked={enabled}
                          aria-label={`${label}: ${enabled ? "enabled" : "disabled"}`}
                          disabled={metaLoading || !canSuspend}
                          onClick={async () => {
                            setMetaLoading(true); setMetaError(null);
                            try {
                              await api.patch(`/admin/organizations/${id}/channel-access`, { [field]: !enabled });
                              setApiProfile((p) => p && { ...p, overview: { ...p.overview, [field]: !enabled } });
                            } catch (err) {
                              setMetaError(err instanceof Error ? err.message : `Failed to update ${label.toLowerCase()}`);
                            } finally { setMetaLoading(false); }
                          }}
                          className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-left transition hover:border-orange-300 dark:hover:border-orange-500/40 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span>
                            <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">{label}</span>
                            <span className="mt-0.5 block text-xs font-normal text-slate-500 dark:text-slate-400">{description}</span>
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            <span className={cn("relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors", enabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600")}>
                              <span className={cn("absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200", enabled ? "translate-x-5" : "translate-x-0")} />
                            </span>
                            <span className={cn("min-w-12 text-right text-[11px] font-semibold", enabled ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500")}>{enabled ? "Enabled" : "Disabled"}</span>
                          </span>
                        </button>
                      ))}
                      </div>
                    </div>
                  )}
                  {metaLoading && <p className="text-xs text-slate-400 dark:text-slate-500">Saving…</p>}
                </div>
              </div>

              {/* Danger zone — hard delete */}
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Danger Zone</p>
                <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5">
                  <button
                    onClick={() => { setDeleteError(null); setDeleteConfirmOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-red-300 dark:border-red-500/40 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-600 hover:text-white dark:hover:bg-red-600 dark:hover:text-white hover:border-red-600 active:scale-95 transition-all"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Delete Organisation
                  </button>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Permanently removes this organisation and all its data. Cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          )}
        </SectionCard>

        {/* ── Delete Confirmation Modal ── */}
        {suspendConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="suspend-dialog-title">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center shrink-0">
                  <ShieldExclamationIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 id="suspend-dialog-title" className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">Suspend client?</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Suspending <strong className="text-slate-800 dark:text-slate-200">{ov.businessName}</strong> will immediately block all dashboard logins and API-key access. You can reactivate the client later.
                  </p>
                </div>
              </div>

              {actionError && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-xs">
                  <ShieldExclamationIcon className="w-3.5 h-3.5 shrink-0" />
                  {actionError}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-1">
                <button onClick={() => setSuspendConfirmOpen(false)} disabled={actionLoading} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50">
                  Cancel
                </button>
                <button
                  disabled={actionLoading}
                  onClick={async () => {
                    setActionLoading(true);
                    setActionError(null);
                    try {
                      await api.post(`/admin/organizations/${id}/suspend`);
                      setApiProfile((p) => p && { ...p, overview: { ...p.overview, status: "Suspended" } });
                      setSuspendConfirmOpen(false);
                    } catch (err) {
                      setActionError(err instanceof Error ? err.message : "Failed to suspend client");
                    } finally {
                      setActionLoading(false);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 active:scale-95 transition-all shadow-sm shadow-red-600/20 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  {actionLoading ? "Suspending…" : "Yes, Suspend Client"}
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center shrink-0">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">Delete Organisation?</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    This will permanently delete <strong className="text-slate-800 dark:text-slate-200">{ov.businessName}</strong> and all associated users, API keys, invoices, and data. This action <strong>cannot be undone</strong>.
                  </p>
                </div>
              </div>

              {deleteError && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-xs">
                  <ShieldExclamationIcon className="w-3.5 h-3.5 shrink-0" />
                  {deleteError}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-1">
                <button
                  onClick={() => setDeleteConfirmOpen(false)}
                  disabled={deleteLoading}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  disabled={deleteLoading}
                  onClick={async () => {
                    setDeleteLoading(true);
                    setDeleteError(null);
                    try {
                      await api.delete(`/admin/organizations/${id}/hard-delete`);
                      navigate(returnTo);
                    } catch (err) {
                      setDeleteError(err instanceof Error ? err.message : "Failed to delete organisation");
                      setDeleteLoading(false);
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 active:scale-95 transition-all shadow-sm shadow-red-600/20 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  <TrashIcon className="w-4 h-4" />
                  {deleteLoading ? "Deleting…" : "Yes, Delete Permanently"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Not found (neither API nor mock data) ──────────────────────────────────
  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <p className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">Client not found</p>
        <p className="text-sm mb-4">No client with ID: {id}</p>
        <button onClick={() => navigate(returnTo)} className="text-sm text-orange-600 font-semibold hover:underline">
          ← Back to Clients
        </button>
      </div>
    );
  }

  // ── Mock-data profile (internal CRM clients from master / migration tabs) ──
  const rag = RAG_CONFIG[client.ragStatus];
  const isSuspended = client.platformActivity.accountStatus === "Suspended";

  return (
    <div className="space-y-5 max-w-5xl">

      {/* ── Back ── */}
      <button
        onClick={() => navigate(returnTo)}
        className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-500 transition-colors active:scale-95"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Back to Clients
      </button>

      {/* ── Hero ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="h-1.5 w-full" style={avatarGradient(client.name)} />
        <div className="flex flex-wrap items-start gap-4 p-5">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-black shrink-0 shadow-lg"
            style={avatarGradient(client.name)}
          >
            {client.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{client.name}</h1>
              <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", STATUS_BADGE[client.projectStatus])}>
                {client.projectStatus}
              </span>
              <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", ACCOUNT_BADGE[client.platformActivity.accountStatus])}>
                {client.platformActivity.accountStatus}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <TagIcon className="w-3.5 h-3.5" /> {client.id}
              </span>
              <span className="flex items-center gap-1">
                <MapPinIcon className="w-3.5 h-3.5" /> {client.state}, {client.zone}
              </span>
              <span className="font-mono">{client.tin}</span>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-5 px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
            <div className="text-center">
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {client.platformActivity.totalInvoices}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Invoices</p>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-0.5">
                <span className={cn("w-2 h-2 rounded-full", rag.dot)} />
                <p className={cn("text-sm font-bold", rag.text)}>{rag.label}</p>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">RAG Status</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 1: Company Information ── */}
      <SectionCard title="Company Information" icon={<BuildingOfficeIcon className="w-4 h-4" />} accent="blue">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
          <Field label="Company Name" value={client.name} />
          <Field label="TIN" value={client.tin} nrs />
          <Field label="Registered State" value={client.state} />
          <Field label="Geopolitical Zone" value={client.zone} />
          <Field label="Sector" value={client.sector} nrs />
          <Field label="Turnover Band" nrs>
            <span className={cn(
              "text-xs font-semibold px-2.5 py-1 rounded-full border inline-block",
              client.turnoverBand === "Large"
                ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/20"
                : client.turnoverBand === "Medium"
                ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
            )}>
              {client.turnoverBand} Taxpayer
            </span>
          </Field>
          <Field label="NRS Registration Status" nrs>
            <span className={cn(
              "text-xs font-semibold px-2.5 py-1 rounded-full border inline-block",
              client.nrsStatus === "Registered"
                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
            )}>
              {client.nrsStatus}
            </span>
          </Field>
        </div>
        <p className="text-[11px] text-blue-500 dark:text-blue-400 mt-5 flex items-center gap-1.5 opacity-70">
          <span className="font-bold bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-500/20">NRS</span>
          Fields labelled NRS are sourced from the NRS entity registry and are read-only.
        </p>
      </SectionCard>

      {/* ── Section 2: Implementation Details ── */}
      <SectionCard title="Implementation Details" icon={<WrenchScrewdriverIcon className="w-4 h-4" />} accent="orange">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 mb-5">
          <Field label="ERP System">
            {client.erpSystem === "None" ? (
              <span className="text-sm text-slate-400 dark:text-slate-500">No ERP integration</span>
            ) : (
              <span className="text-sm font-semibold font-mono text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 inline-block">
                {client.erpSystem}
              </span>
            )}
          </Field>
          <Field label="Service / Interest Type">
            <div className="flex flex-wrap gap-1 mt-0.5">
              {client.serviceTypes.map((t) => (
                <span key={t} className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  {t}
                </span>
              ))}
            </div>
          </Field>
          <Field label="Project Status">
            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full inline-block mt-0.5", STATUS_BADGE[client.projectStatus])}>
              {client.projectStatus}
            </span>
          </Field>
          <Field label="RAG Status">
            <div className="flex items-center gap-2 mt-0.5">
              <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", rag.dot)} />
              <span className={cn("text-sm font-semibold", rag.text)}>{rag.label}</span>
            </div>
          </Field>
          <Field label="Activity Description" value={client.activityNote} />
        </div>
        <Field label="Latest Update Note">
          <div className="mt-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <EditableNote
              value={client.activityNote}
              onSave={(note) => setClient((c) => c && { ...c, activityNote: note })}
            />
          </div>
        </Field>
      </SectionCard>

      {/* ── Section 3: Dashboard Migration ── */}
      <SectionCard title="Dashboard Migration" icon={<ComputerDesktopIcon className="w-4 h-4" />} accent="purple">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
          <Field label="Go-Live Date">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 font-mono">
              {client.dashboardMigration.goLiveDate ?? <span className="text-slate-300 dark:text-slate-600 font-sans font-normal">—</span>}
            </p>
          </Field>
          <Field label="Credentials Created">
            <span className={cn(
              "text-xs font-semibold px-2.5 py-1 rounded-full border inline-block mt-0.5",
              client.dashboardMigration.credentialsCreated
                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
            )}>
              {client.dashboardMigration.credentialsCreated ? "Yes" : "No"}
            </span>
          </Field>
          <Field label="Date Credentials Issued">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 font-mono">
              {client.dashboardMigration.dateCredentialsIssued ?? <span className="text-slate-300 dark:text-slate-600 font-sans font-normal">—</span>}
            </p>
          </Field>
          <Field label="Scheduled Meeting">
            <span className={cn(
              "text-xs font-medium px-2.5 py-1 rounded-full border inline-block mt-0.5",
              client.dashboardMigration.scheduledMeeting === "Yes"
                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                : client.dashboardMigration.scheduledMeeting === "Sent Guidelines"
                ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
            )}>
              {client.dashboardMigration.scheduledMeeting}
            </span>
          </Field>
          <Field label="Service" value={client.dashboardMigration.service} />
          <Field label="Status Note">
            {client.dashboardMigration.statusNote ? (
              <span className={cn(
                "text-xs font-semibold px-2.5 py-1 rounded-full border inline-block mt-0.5",
                client.dashboardMigration.statusNote === "LIVE"
                  ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
              )}>
                {client.dashboardMigration.statusNote}
              </span>
            ) : <span className="text-slate-300 dark:text-slate-600 text-sm">—</span>}
          </Field>
        </div>
      </SectionCard>

      {/* ── Section 4: Platform Activity ── */}
      <SectionCard title="Platform Activity" icon={<ChartBarIcon className="w-4 h-4" />} accent="green">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
          <Field label="Total Invoices Generated">
            <p className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {client.platformActivity.totalInvoices.toLocaleString()}
            </p>
          </Field>
          <Field label="First Invoice Date">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 font-mono">
              {client.platformActivity.firstInvoiceDate ?? <span className="text-slate-300 dark:text-slate-600 font-sans font-normal">—</span>}
            </p>
          </Field>
          <Field label="Last Invoice Date">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 font-mono">
              {client.platformActivity.lastInvoiceDate ?? <span className="text-slate-300 dark:text-slate-600 font-sans font-normal">—</span>}
            </p>
          </Field>
          <Field label="Platform Onboarding Date">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 font-mono">
              {client.platformActivity.onboardingDate}
            </p>
          </Field>
          <Field label="Account Status">
            <span className={cn(
              "text-xs font-semibold px-2.5 py-1 rounded-full border inline-block mt-0.5",
              ACCOUNT_BADGE[client.platformActivity.accountStatus]
            )}>
              {client.platformActivity.accountStatus}
            </span>
          </Field>
          <Field label="Last Login">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 font-mono">
              {client.platformActivity.lastLoginDate ?? <span className="text-slate-300 dark:text-slate-600 font-sans font-normal">—</span>}
            </p>
          </Field>
        </div>
      </SectionCard>

      {/* ── Section 5: Admin Controls ── */}
      <SectionCard title="Admin Controls" icon={<ShieldExclamationIcon className="w-4 h-4" />} accent="red">

        {/* Viewer notice */}
        {!canWrite && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs">
            <LockClosedIcon className="w-3.5 h-3.5 shrink-0" />
            You have view-only access. Contact a System Admin to make changes.
          </div>
        )}

        {/* Status dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 mb-5">
          <Field label="Project Status">
            {canWrite ? (
              <select
                value={client.projectStatus}
                onChange={(e) => setClient((c) => c && { ...c, projectStatus: e.target.value as ProjectStatus })}
                className="mt-0.5 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400/30 cursor-pointer w-full"
              >
                <option value="Live">Live</option>
                <option value="In Progress">In Progress</option>
                <option value="Blocked">Blocked</option>
                <option value="Not Started">Not Started</option>
              </select>
            ) : (
              <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full inline-block mt-0.5", STATUS_BADGE[client.projectStatus])}>
                {client.projectStatus}
              </span>
            )}
          </Field>
          <Field label="RAG Status">
            {canWrite ? (
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", rag.dot)} />
                <select
                  value={client.ragStatus}
                  onChange={(e) => setClient((c) => c && { ...c, ragStatus: e.target.value as RAGStatus })}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400/30 cursor-pointer flex-1"
                >
                  <option value="GREEN">Green — On Track</option>
                  <option value="AMBER">Amber — At Risk</option>
                  <option value="RED">Red — Critical</option>
                  <option value="PENDING">Pending — No Kickoff</option>
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", rag.dot)} />
                <span className={cn("text-sm font-semibold", rag.text)}>{rag.label}</span>
              </div>
            )}
          </Field>
        </div>

        {/* Implementation notes */}
        <Field label="Implementation Notes">
          <div className="mt-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <EditableNote
              value={client.activityNote}
              readOnly={!canWrite}
              onSave={(note) => setClient((c) => c && { ...c, activityNote: note })}
            />
          </div>
        </Field>

        {/* Suspend / Reactivate — SYSTEM_ADMIN only */}
        {canSuspend && (
          <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-3">
            {actionError && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-xs">
                <ShieldExclamationIcon className="w-3.5 h-3.5 shrink-0" />
                {actionError}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              {isSuspended ? (
                <button
                  disabled={actionLoading}
                  onClick={async () => {
                    setActionLoading(true);
                    setActionError(null);
                    try {
                      await api.post(`/admin/organizations/${id}/activate`);
                      setClient((c) => c && { ...c, platformActivity: { ...c.platformActivity, accountStatus: "Active" } });
                    } catch (err: unknown) {
                      const message = err instanceof Error ? err.message : "Failed to activate client";
                      setActionError(message);
                    } finally {
                      setActionLoading(false);
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 active:scale-95 transition-all shadow-sm shadow-emerald-600/20 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  {actionLoading ? "Activating…" : "Reactivate Client"}
                </button>
              ) : (
                <button
                  disabled={actionLoading}
                  onClick={async () => {
                    setActionLoading(true);
                    setActionError(null);
                    try {
                      await api.post(`/admin/organizations/${id}/suspend`);
                      setClient((c) => c && { ...c, platformActivity: { ...c.platformActivity, accountStatus: "Suspended" } });
                    } catch (err: unknown) {
                      const message = err instanceof Error ? err.message : "Failed to suspend client";
                      setActionError(message);
                    } finally {
                      setActionLoading(false);
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 active:scale-95 transition-all shadow-sm shadow-red-600/20 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  {actionLoading ? "Suspending…" : "Suspend Client"}
                </button>
              )}
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {isSuspended
                  ? "Client is suspended. Reactivating restores all platform access."
                  : "Suspending blocks all logins and API access for this organisation."}
              </p>
            </div>

            {isSuspended && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                <ShieldExclamationIcon className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 dark:text-red-400">
                  This client is currently <strong>suspended</strong>. All users receive a 403 on login with instructions to contact{" "}
                  <span className="font-mono">support@cryptwaresystems.com</span>.
                </p>
              </div>
            )}
          </div>
        )}
      </SectionCard>

    </div>
  );
}
