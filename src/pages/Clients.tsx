import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import {
  MagnifyingGlassIcon,
  ChevronUpDownIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  PlusIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import EditCrmClientModal from "@/components/crm/EditCrmClientModal";
import AddCrmClientModal from "@/components/crm/AddCrmClientModal";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { type Client, type ProjectStatus, type RAGStatus, type ServiceType } from "@/data/clients";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
type SortField = "name" | "erpSystem" | "projectStatus" | "ragStatus";
type SortDir = "asc" | "desc";
type ActiveTab = "master" | "migration" | "onboarded";
type OnboardedStatus = "Active" | "Suspended" | "Inactive Warning";
type ActivityLevel = "High" | "Medium" | "Low" | "Inactive";

type ServiceCategory = "DASHBOARD" | "ERP" | "BOTH";
type CredentialEnvironment = "TEST" | "PROD" | "BOTH";

interface OnboardedClient {
  id: string;
  businessName: string;
  tin: string;
  email: string;
  sector: string | null;
  status: OnboardedStatus;
  onboardingDate: string;
  lastApiActivity: string | null;
  activeApiKeys: number;
  totalApiKeys: number;
  totalInvoices: number;
  lastInvoiceDate: string | null;
  activityLevel: ActivityLevel;
  serviceCategory: ServiceCategory;
  dashboardAccessEnabled: boolean;
  apiAccessEnabled: boolean;
  credentialEnvironment: CredentialEnvironment;
}

interface OnboardedStats {
  total: number;
  active: number;
  suspended: number;
  inactiveWarning: number;
}

interface OnboardedResponse {
  status: string;
  data: {
    stats: OnboardedStats;
    clients: OnboardedClient[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
}

interface CrmStats {
  total: number;
  live: number;
  inProgress: number;
  blocked: number;
  notStarted: number;
  ragCounts: Record<RAGStatus, number>;
  migration: {
    live: number;
    credentialsReady: number;
    meetingArranged: number;
    pending: number;
  };
}

interface CrmResponse {
  status: string;
  data: {
    clients: Client[];
    stats: CrmStats;
    pagination: { total: number; page: number; limit: number; pages: number };
  };
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

const STATUS_BADGE: Record<ProjectStatus, string> = {
  Live:           "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20",
  "In Progress":  "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20",
  Blocked:        "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20",
  "Not Started":  "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700",
};

const STATUS_DOT: Record<ProjectStatus, string> = {
  Live: "bg-emerald-500",
  "In Progress": "bg-amber-400",
  Blocked: "bg-red-500",
  "Not Started": "bg-slate-400",
};

const RAG_CONFIG: Record<RAGStatus, { dot: string; bg: string; border: string; text: string; label: string; barColor: string }> = {
  GREEN:   { dot: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "border-emerald-200 dark:border-emerald-500/20", text: "text-emerald-800 dark:text-emerald-400", label: "On Track", barColor: "#10b981" },
  AMBER:   { dot: "bg-amber-400",   bg: "bg-amber-50 dark:bg-amber-500/10",     border: "border-amber-200 dark:border-amber-500/20",     text: "text-amber-800 dark:text-amber-400",   label: "At Risk",   barColor: "#f59e0b" },
  RED:     { dot: "bg-red-500",     bg: "bg-red-50 dark:bg-red-500/10",         border: "border-red-200 dark:border-red-500/20",         text: "text-red-800 dark:text-red-400",       label: "Critical",  barColor: "#ef4444" },
  PENDING: { dot: "bg-slate-400",   bg: "bg-slate-100 dark:bg-slate-800",       border: "border-slate-200 dark:border-slate-700",       text: "text-slate-600 dark:text-slate-400",   label: "No Kickoff",barColor: "#94a3b8" },
};

const SERVICE_BADGE: Record<ServiceType, string> = {
  "Dashboard":       "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20",
  "ERP Support":     "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-500/20",
  "ERP End-to-End":  "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20",
  "Combined":        "bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20",
};

const ONBOARDED_STATUS_BADGE: Record<OnboardedStatus, string> = {
  "Active":           "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20",
  "Suspended":        "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20",
  "Inactive Warning": "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20",
};

const ONBOARDED_STATUS_DOT: Record<OnboardedStatus, string> = {
  "Active":           "bg-emerald-500",
  "Suspended":        "bg-red-500",
  "Inactive Warning": "bg-amber-400",
};

const SERVICE_CATEGORY_BADGE: Record<ServiceCategory, string> = {
  DASHBOARD: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20",
  ERP:       "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20",
  BOTH:      "bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20",
};

const SERVICE_CATEGORY_LABEL: Record<ServiceCategory, string> = {
  DASHBOARD: "Dashboard only",
  ERP:       "API only",
  BOTH:      "Dashboard + API",
};

const CRED_ENV_BADGE: Record<CredentialEnvironment, string> = {
  TEST: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700",
  PROD: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20",
  BOTH: "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-500/20",
};

const ACTIVITY_BADGE: Record<ActivityLevel, string> = {
  High: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20",
  Medium: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20",
  Low: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20",
  Inactive: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700", className)} />;
}

function SortIcon({ field, active, dir }: { field: SortField; active: SortField; dir: SortDir }) {
  if (field !== active) return <ChevronUpDownIcon className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 ml-1 inline" />;
  return dir === "asc"
    ? <ChevronUpIcon className="w-3.5 h-3.5 text-orange-500 ml-1 inline" />
    : <ChevronDownIcon className="w-3.5 h-3.5 text-orange-500 ml-1 inline" />;
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Clients() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const geographicZone = searchParams.get("zone") ?? "";
  const geographicState = searchParams.get("state") ?? "";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "All">("All");
  const [serviceFilter, setServiceFilter] = useState<ServiceType | "All">("All");
  const [ragFilter, setRagFilter] = useState<RAGStatus | "All">("All");
  const [erpFilter, setErpFilter] = useState<string>("All");
  const [locationFilter, setLocationFilter] = useState<string>(() => searchParams.get("zone") ?? "All");
  const [stateFilter, setStateFilter] = useState<string>(() => searchParams.get("state") ?? "All");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [activeTab, setActiveTab] = useState<ActiveTab>(() =>
    searchParams.get("tab") === "onboarded" || searchParams.get("status") ? "onboarded" : "master"
  );

  // ── Dashboard Migration state ──────────────────────────────────────────────
  const [migSearch, setMigSearch] = useState("");
  const [migCredFilter, setMigCredFilter] = useState<"All" | "Yes" | "No">("All");
  const [migMeetingFilter, setMigMeetingFilter] = useState<"All" | "Yes" | "No" | "Sent Guidelines">("All");

  // ── CRM Clients state ─────────────────────────────────────────────────────
  const [crmClients, setCrmClients] = useState<Client[]>([]);
  const [crmStats, setCrmStats] = useState<CrmStats | null>(null);
  const [crmLoading, setCrmLoading] = useState(false);
  const [crmError, setCrmError] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [addClientOpen, setAddClientOpen] = useState(false);

  const fetchCrm = useCallback(async () => {
    setCrmLoading(true);
    setCrmError(null);
    try {
      const res = await api.get<CrmResponse>("/admin/crm/clients?limit=200");
      setCrmClients(res.data.clients);
      setCrmStats(res.data.stats);
    } catch (err) {
      setCrmError(err instanceof Error ? err.message : "Failed to load CRM clients");
    } finally {
      setCrmLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCrm();
  }, [fetchCrm]);

  // ── Onboarded Clients state ────────────────────────────────────────────────
  const [onboardedClients, setOnboardedClients] = useState<OnboardedClient[]>([]);
  const [onboardedStats, setOnboardedStats] = useState<OnboardedStats | null>(null);
  const [onboardedPagination, setOnboardedPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [onboardedSearch, setOnboardedSearch] = useState("");
  const [onboardedStatusFilter, setOnboardedStatusFilter] = useState<OnboardedStatus | "All">(() => {
    const s = searchParams.get("status");
    if (s === "Suspended") return "Suspended";
    if (s === "warning") return "Inactive Warning";
    return "All";
  });
  const [onboardedPage, setOnboardedPage] = useState(1);
  const [onboardedLoading, setOnboardedLoading] = useState(false);
  const [onboardedError, setOnboardedError] = useState<string | null>(null);
  const [invoiceActivityFilter, setInvoiceActivityFilter] = useState<string>("All");
  const [activityLevelFilter, setActivityLevelFilter] = useState<string>("All");
  const [onboardedServiceFilter, setOnboardedServiceFilter] = useState<ServiceCategory | "All">("All");
  const [invoiceSort, setInvoiceSort] = useState<"none" | "asc" | "desc">("none");
  const [onboardedFrom, setOnboardedFrom] = useState<string>("");
  const [onboardedTo, setOnboardedTo] = useState<string>("");

  const fetchOnboarded = useCallback(async (
    search: string,
    status: string,
    page: number,
    invoiceActivity: string,
    activityLevel: string,
    invoiceOrder: string,
    dateFrom: string,
    dateTo: string,
    serviceCategory: string,
  ) => {
    setOnboardedLoading(true);
    setOnboardedError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search.trim()) params.set("search", search.trim());
      if (status !== "All") params.set("status", status.toLowerCase().replace(/ /g, "_").replace("inactive_warning", "warning"));
      if (invoiceActivity !== "All") params.set("invoiceActivity", invoiceActivity);
      if (activityLevel !== "All") params.set("activityLevel", activityLevel.toLowerCase());
      if (invoiceOrder !== "none") params.set("invoiceSort", invoiceOrder);
      if (geographicZone) params.set("zone", geographicZone);
      if (geographicState) params.set("state", geographicState);
      if (dateFrom) params.set("onboardedFrom", dateFrom);
      if (dateTo) params.set("onboardedTo", dateTo);
      if (serviceCategory !== "All") params.set("serviceCategory", serviceCategory);
      const res = await api.get<OnboardedResponse>(`/admin/clients/onboarded?${params.toString()}`);
      setOnboardedClients(res.data.clients);
      setOnboardedStats(res.data.stats);
      setOnboardedPagination(res.data.pagination);
    } catch (err) {
      setOnboardedError(err instanceof Error ? err.message : "Failed to load onboarded clients");
    } finally {
      setOnboardedLoading(false);
    }
  }, [geographicZone, geographicState]);

  useEffect(() => {
    if (activeTab === "onboarded") {
      fetchOnboarded(onboardedSearch, onboardedStatusFilter, onboardedPage, invoiceActivityFilter, activityLevelFilter, invoiceSort, onboardedFrom, onboardedTo, onboardedServiceFilter);
    }
  }, [activeTab, onboardedSearch, onboardedStatusFilter, onboardedPage, invoiceActivityFilter, activityLevelFilter, invoiceSort, onboardedFrom, onboardedTo, onboardedServiceFilter, fetchOnboarded]);

  // ── Stats (from API) ───────────────────────────────────────────────────────
  const total      = crmStats?.total ?? 0;
  const live       = crmStats?.live ?? 0;
  const inProgress = crmStats?.inProgress ?? 0;
  const blocked    = crmStats?.blocked ?? 0;
  const notStarted = crmStats?.notStarted ?? 0;

  const ragCounts: Record<RAGStatus, number> = {
    GREEN:   crmStats?.ragCounts.GREEN   ?? 0,
    AMBER:   crmStats?.ragCounts.AMBER   ?? 0,
    RED:     crmStats?.ragCounts.RED     ?? 0,
    PENDING: crmStats?.ragCounts.PENDING ?? 0,
  };

  // ── Migration stats & filtered list (Dashboard-service clients only) ────────
  const dashboardClients = useMemo(
    () => crmClients.filter(c => c.serviceTypes.includes("Dashboard")),
    [crmClients],
  );

  const migTotal           = dashboardClients.length;
  const migLive            = dashboardClients.filter(c => c.dashboardMigration.statusNote === "LIVE").length;
  const migCredReady       = dashboardClients.filter(c => c.dashboardMigration.credentialsCreated).length;
  const migMeetingArranged = dashboardClients.filter(c => c.dashboardMigration.scheduledMeeting === "Yes").length;
  const migPending         = migTotal - migLive;

  const migFiltered = useMemo(() => {
    let list = dashboardClients;
    if (migSearch.trim()) list = list.filter(c => c.name.toLowerCase().includes(migSearch.toLowerCase()));
    if (migCredFilter !== "All") list = list.filter(c => migCredFilter === "Yes" ? c.dashboardMigration.credentialsCreated : !c.dashboardMigration.credentialsCreated);
    if (migMeetingFilter !== "All") list = list.filter(c => c.dashboardMigration.scheduledMeeting === migMeetingFilter);
    return list;
  }, [dashboardClients, migSearch, migCredFilter, migMeetingFilter]);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo<Client[]>(() => {
    let list = crmClients;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.tin.includes(q));
    }
    if (statusFilter !== "All")   list = list.filter((c) => c.projectStatus === statusFilter);
    if (serviceFilter !== "All")  list = list.filter((c) => c.serviceTypes.includes(serviceFilter as ServiceType));
    if (ragFilter !== "All")      list = list.filter((c) => c.ragStatus === ragFilter);
    if (erpFilter !== "All")      list = list.filter((c) => c.erpSystem.toLowerCase().includes(erpFilter.toLowerCase()));
    if (locationFilter !== "All") list = list.filter((c) => c.zone === locationFilter);
    if (stateFilter !== "All")    list = list.filter((c) => c.state === stateFilter);
    return [...list].sort((a, b) => {
      const cmp = String(a[sortField] ?? "").localeCompare(String(b[sortField] ?? ""));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [crmClients, search, statusFilter, serviceFilter, ragFilter, erpFilter, locationFilter, stateFilter, sortField, sortDir]);

  const availableStates = useMemo(
    () => [...new Set(crmClients.filter(c => locationFilter === "All" || c.zone === locationFilter).map(c => c.state))].sort(),
    [crmClients, locationFilter],
  );

  function handleSort(f: SortField) {
    if (sortField === f) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(f); setSortDir("asc"); }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Client Monitor</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {crmLoading ? "Loading…" : `${total} clients across all implementation stages`}
          </p>
        </div>
        <button
          onClick={() => setAddClientOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 active:scale-95 transition-all shadow-sm shadow-orange-600/20"
        >
          <PlusIcon className="w-4 h-4" />
          Add Client
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        {[
          { label: "Total",       value: total,      color: "border-t-slate-400",    textColor: "text-slate-600 dark:text-slate-400",    numColor: "text-slate-900 dark:text-slate-100" },
          { label: "Live",        value: live,       color: "border-t-emerald-500",  textColor: "text-emerald-600 dark:text-emerald-400", numColor: "text-emerald-700 dark:text-emerald-400" },
          { label: "In Progress", value: inProgress, color: "border-t-amber-400",    textColor: "text-amber-600 dark:text-amber-400",     numColor: "text-amber-700 dark:text-amber-400" },
          { label: "Blocked",     value: blocked,    color: "border-t-red-500",      textColor: "text-red-600 dark:text-red-400",         numColor: "text-red-700 dark:text-red-400" },
          { label: "Not Started", value: notStarted, color: "border-t-slate-300",    textColor: "text-slate-500 dark:text-slate-500",     numColor: "text-slate-600 dark:text-slate-400" },
        ].map((card) => (
          <div
            key={card.label}
            className={cn(
              "bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm border-t-[3px] transition-shadow hover:shadow-md dark:hover:shadow-slate-900/50",
              card.color
            )}
          >
            <p className={cn("text-3xl font-black tracking-tight", card.numColor)}>{card.value}</p>
            <p className={cn("text-xs font-medium mt-1", card.textColor)}>{card.label}</p>
          </div>
        ))}
      </div>

      {/* ── RAG Distribution ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">RAG Status Distribution</p>
          {ragFilter !== "All" && (
            <button
              onClick={() => setRagFilter("All")}
              className="text-xs text-orange-600 font-medium hover:underline"
            >
              Clear filter
            </button>
          )}
        </div>

        {/* Segmented bar */}
        <div className="flex h-3 rounded-full overflow-hidden mb-4 gap-px">
          {(["GREEN", "AMBER", "RED", "PENDING"] as RAGStatus[]).map((rag) => {
            const count = ragCounts[rag];
            const pct = total > 0 ? (count / total) * 100 : 0;
            return pct > 0 ? (
              <button
                key={rag}
                onClick={() => setRagFilter((prev) => (prev === rag ? "All" : rag))}
                className="h-full transition-opacity hover:opacity-80 active:opacity-60"
                style={{ width: `${pct}%`, backgroundColor: RAG_CONFIG[rag].barColor }}
                title={`${RAG_CONFIG[rag].label}: ${count} (${Math.round(pct)}%)`}
              />
            ) : null;
          })}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(["GREEN", "AMBER", "RED", "PENDING"] as RAGStatus[]).map((rag) => {
            const cfg = RAG_CONFIG[rag];
            const count = ragCounts[rag];
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const active = ragFilter === rag;
            return (
              <button
                key={rag}
                onClick={() => setRagFilter((prev) => (prev === rag ? "All" : rag))}
                className={cn(
                  "relative flex items-center gap-4 px-5 py-3.5 rounded-xl border text-left transition-all overflow-hidden",
                  "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700",
                  "hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm",
                  active && "ring-2 ring-orange-400 ring-offset-2 dark:ring-offset-slate-900"
                )}
              >
                <span className={cn("absolute left-0 inset-y-0 w-1 rounded-l-xl", cfg.dot)} />
                <div className="min-w-0">
                  <p className={cn("text-2xl font-black leading-none", cfg.text)}>{count}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">{cfg.label} · {pct}%</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit">
        {([
          { id: "master",    label: "Client Master List" },
          { id: "migration", label: "Dashboard Migration" },
          { id: "onboarded", label: "Onboarded Clients" },
        ] as { id: ActiveTab; label: string }[]).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
              activeTab === id
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Master List Table ── */}
      {activeTab === "master" && (
        <>
          {/* Filters */}
          {(geographicZone || geographicState) && (
            <div className="flex items-center gap-2 rounded-xl border border-orange-200 dark:border-orange-500/20 bg-orange-50 dark:bg-orange-500/10 px-4 py-3 text-sm text-orange-800 dark:text-orange-300">
              Showing clients in <strong>{geographicState || geographicZone}</strong>
              <button onClick={() => navigate("/clients")} className="ml-auto text-xs font-semibold hover:underline">Clear location</button>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48 max-w-sm">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search by name or TIN…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | "All")}
              className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Live">Live</option>
              <option value="In Progress">In Progress</option>
              <option value="Blocked">Blocked</option>
              <option value="Not Started">Not Started</option>
            </select>

            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value as ServiceType | "All")}
              className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition cursor-pointer"
            >
              <option value="All">All Services</option>
              <option value="Dashboard">Dashboard</option>
              <option value="ERP Support">ERP Support</option>
              <option value="ERP End-to-End">ERP End-to-End</option>
              <option value="Combined">Combined</option>
            </select>

            <select
              value={erpFilter}
              onChange={(e) => setErpFilter(e.target.value)}
              className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition cursor-pointer"
            >
              <option value="All">All ERPs</option>
              <option value="SAP">SAP</option>
              <option value="Oracle">Oracle</option>
              <option value="MS Dynamics">MS Dynamics</option>
              <option value="Sage">Sage</option>
              <option value="QuickBooks">QuickBooks</option>
              <option value="TALLY">TALLY</option>
              <option value="None">None</option>
            </select>

            <select
              value={locationFilter}
              onChange={(e) => { setLocationFilter(e.target.value); setStateFilter("All"); }}
              className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition cursor-pointer"
            >
              <option value="All">All Zones</option>
              <option value="South West">South West</option>
              <option value="South South">South South</option>
              <option value="South East">South East</option>
              <option value="North West">North West</option>
              <option value="North East">North East</option>
              <option value="North Central">North Central</option>
            </select>

            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition cursor-pointer"
            >
              <option value="All">All States</option>
              {availableStates.map(state => <option key={state} value={state}>{state}</option>)}
            </select>

            {(statusFilter !== "All" || serviceFilter !== "All" || ragFilter !== "All" || erpFilter !== "All" || locationFilter !== "All" || stateFilter !== "All" || search) && (
              <button
                onClick={() => { setSearch(""); setStatusFilter("All"); setServiceFilter("All"); setRagFilter("All"); setErpFilter("All"); setLocationFilter("All"); setStateFilter("All"); }}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 px-2 py-2.5 transition-colors"
              >
                Clear all
              </button>
            )}

            <span className="ml-auto text-xs text-slate-400 dark:text-slate-500 font-medium">
              {filtered.length} of {total}
            </span>
          </div>

          {crmError && (
            <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">
              {crmError}
            </div>
          )}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <Table className="[&_td]:align-top">
            <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
              <TableRow className="hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-default">
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort("name")}>
                  Client / Company <SortIcon field="name" active={sortField} dir={sortDir} />
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort("erpSystem")}>
                  ERP <SortIcon field="erpSystem" active={sortField} dir={sortDir} />
                </TableHead>
                <TableHead>Service</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort("projectStatus")}>
                  Status <SortIcon field="projectStatus" active={sortField} dir={sortDir} />
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort("ragStatus")}>
                  RAG <SortIcon field="ragStatus" active={sortField} dir={sortDir} />
                </TableHead>
                <TableHead className="min-w-[200px]">Latest Activity</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {crmLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="hover:bg-transparent dark:hover:bg-transparent cursor-default">
                    <TableCell><Skeleton className="h-9 w-44" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell />
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow className="hover:bg-transparent dark:hover:bg-transparent cursor-default">
                  <TableCell colSpan={7} className="py-16 text-center text-sm text-slate-400 dark:text-slate-500">
                    No clients match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((client) => (
                  <TableRow key={client.id} onClick={() => navigate(`/clients/${client.id}`)}>
                    {/* Client */}
                    <TableCell className="pt-3">
                      <div className="flex items-start gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm mt-0.5"
                          style={avatarGradient(client.name)}
                        >
                          {client.name[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm leading-tight">
                            {client.name}
                          </p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono">
                            {client.tin}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* ERP */}
                    <TableCell>
                      {client.erpSystem === "None" ? (
                        <span className="text-slate-300 dark:text-slate-600 text-sm">—</span>
                      ) : (
                        <span className="text-xs font-medium font-mono whitespace-nowrap bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                          {client.erpSystem}
                        </span>
                      )}
                    </TableCell>

                    {/* Service */}
                    <TableCell className="pt-3">
                      <div className="flex flex-col gap-1">
                        {client.serviceTypes.map((t) => (
                          <span key={t} className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap w-fit", SERVICE_BADGE[t])}>
                            {t}
                          </span>
                        ))}
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="pt-3">
                      <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full", STATUS_BADGE[client.projectStatus])}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_DOT[client.projectStatus])} />
                        {client.projectStatus}
                      </span>
                    </TableCell>

                    {/* RAG */}
                    <TableCell className="pt-3">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", RAG_CONFIG[client.ragStatus].dot)} />
                        <span className="text-xs text-slate-600 dark:text-slate-400">{RAG_CONFIG[client.ragStatus].label}</span>
                      </div>
                    </TableCell>

                    {/* Activity */}
                    <TableCell className="max-w-xs pt-3">
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate leading-relaxed">
                        {client.activityNote}
                      </p>
                    </TableCell>

                    {/* Edit */}
                    <TableCell className="text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingClient(client); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition opacity-0 group-hover:opacity-100"
                        title="Edit CRM record"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        </>
      )}

      {/* ── Onboarded Clients (API) ── */}
      {activeTab === "onboarded" && (
        <div className="space-y-4">
          {(geographicZone || geographicState) && (
            <div className="flex items-center gap-2 rounded-xl border border-orange-200 dark:border-orange-500/20 bg-orange-50 dark:bg-orange-500/10 px-4 py-3 text-sm text-orange-800 dark:text-orange-300">
              Showing onboarded clients in <strong>{geographicState || geographicZone}</strong>
              <button onClick={() => navigate("/clients?tab=onboarded")} className="ml-auto text-xs font-semibold hover:underline">Clear location</button>
            </div>
          )}
          {/* Stats */}
          {onboardedStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Onboarded", value: onboardedStats.total,          color: "border-t-slate-400",   textColor: "text-slate-600 dark:text-slate-400",    numColor: "text-slate-900 dark:text-slate-100" },
                { label: "Active",          value: onboardedStats.active,          color: "border-t-emerald-500", textColor: "text-emerald-600 dark:text-emerald-400", numColor: "text-emerald-700 dark:text-emerald-400" },
                { label: "Inactive Warning",value: onboardedStats.inactiveWarning, color: "border-t-amber-400",   textColor: "text-amber-600 dark:text-amber-400",     numColor: "text-amber-700 dark:text-amber-400" },
                { label: "Suspended",       value: onboardedStats.suspended,       color: "border-t-red-500",     textColor: "text-red-600 dark:text-red-400",         numColor: "text-red-700 dark:text-red-400" },
              ].map((card) => (
                <div
                  key={card.label}
                  className={cn(
                    "bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm border-t-[3px]",
                    card.color
                  )}
                >
                  <p className={cn("text-3xl font-black tracking-tight", card.numColor)}>{card.value}</p>
                  <p className={cn("text-xs font-medium mt-1", card.textColor)}>{card.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48 max-w-sm">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search by name or TIN…"
                value={onboardedSearch}
                onChange={(e) => { setOnboardedSearch(e.target.value); setOnboardedPage(1); }}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition"
              />
            </div>

            <select
              value={onboardedStatusFilter}
              onChange={(e) => { setOnboardedStatusFilter(e.target.value as OnboardedStatus | "All"); setOnboardedPage(1); }}
              className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive Warning">Inactive Warning</option>
              <option value="Suspended">Suspended</option>
              <option value="Deleted">Deleted</option>
            </select>

            <select
              value={invoiceActivityFilter}
              onChange={(e) => { setInvoiceActivityFilter(e.target.value); setOnboardedPage(1); }}
              className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition cursor-pointer"
            >
              <option value="All">All Activity</option>
              <option value="no_activity">No Activity</option>
              <option value="today">Active Today</option>
              <option value="last_7_days">Active Last 7 Days</option>
              <option value="last_30_days">Active Last 30 Days</option>
            </select>

            <select
              value={activityLevelFilter}
              onChange={(e) => { setActivityLevelFilter(e.target.value); setOnboardedPage(1); }}
              className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition cursor-pointer"
            >
              <option value="All">All Activity Levels</option>
              <option value="High">High Activity</option>
              <option value="Medium">Medium Activity</option>
              <option value="Low">Low Activity</option>
              <option value="Inactive">Inactive</option>
            </select>

            <select
              value={onboardedServiceFilter}
              onChange={(e) => { setOnboardedServiceFilter(e.target.value as ServiceCategory | "All"); setOnboardedPage(1); }}
              className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition cursor-pointer"
            >
              <option value="All">All Service Types</option>
              <option value="DASHBOARD">Dashboard only</option>
              <option value="ERP">API only</option>
              <option value="BOTH">Dashboard + API</option>
            </select>

            <select
              value={invoiceSort}
              onChange={(e) => { setInvoiceSort(e.target.value as "none" | "asc" | "desc"); setOnboardedPage(1); }}
              className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition cursor-pointer"
            >
              <option value="none">Invoice Volume</option>
              <option value="desc">Invoices: High to Low</option>
              <option value="asc">Invoices: Low to High</option>
            </select>

            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={onboardedFrom}
                onChange={(e) => { setOnboardedFrom(e.target.value); setOnboardedPage(1); }}
                className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={onboardedTo}
                onChange={(e) => { setOnboardedTo(e.target.value); setOnboardedPage(1); }}
                className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition"
              />
            </div>

            {(onboardedSearch || onboardedStatusFilter !== "All" || invoiceActivityFilter !== "All" || activityLevelFilter !== "All" || onboardedServiceFilter !== "All" || invoiceSort !== "none" || onboardedFrom || onboardedTo) && (
              <button
                onClick={() => { setOnboardedSearch(""); setOnboardedStatusFilter("All"); setInvoiceActivityFilter("All"); setActivityLevelFilter("All"); setOnboardedServiceFilter("All"); setInvoiceSort("none"); setOnboardedFrom(""); setOnboardedTo(""); setOnboardedPage(1); }}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 px-2 py-2.5 transition-colors"
              >
                Clear all
              </button>
            )}
            <span className="ml-auto text-xs text-slate-400 dark:text-slate-500 font-medium">
              {onboardedPagination.total} total
            </span>
          </div>

          {/* Error */}
          {onboardedError && (
            <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">
              {onboardedError}
            </div>
          )}

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                <TableRow className="hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-default">
                  <TableHead>Organisation / TIN</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Environment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Onboarded</TableHead>
                  <TableHead>Last API Activity</TableHead>
                  <TableHead>Activity Level</TableHead>
                  <TableHead className="text-center">API Keys</TableHead>
                  <TableHead
                    className="text-center cursor-pointer select-none"
                    onClick={() => { setInvoiceSort(s => s === "desc" ? "asc" : "desc"); setOnboardedPage(1); }}
                  >
                    Invoices {invoiceSort === "asc" ? "↑" : invoiceSort === "desc" ? "↓" : "↕"}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {onboardedLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="hover:bg-transparent dark:hover:bg-transparent cursor-default">
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : onboardedClients.length === 0 ? (
                  <TableRow className="hover:bg-transparent dark:hover:bg-transparent cursor-default">
                    <TableCell colSpan={11} className="py-16 text-center text-sm text-slate-400 dark:text-slate-500">
                      No onboarded clients match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  onboardedClients.map((client) => (
                    <TableRow key={client.id} onClick={() => navigate(`/clients/${client.id}`)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm"
                            style={avatarGradient(client.businessName)}
                          >
                            {client.businessName[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm leading-tight">{client.businessName}</p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono">{client.tin}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400">{client.email}</TableCell>
                      <TableCell>
                        {client.sector ? (
                          <span className="text-xs text-slate-600 dark:text-slate-400">{client.sector}</span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {client.serviceCategory && (
                          <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap", SERVICE_CATEGORY_BADGE[client.serviceCategory])}>
                            {SERVICE_CATEGORY_LABEL[client.serviceCategory]}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {client.credentialEnvironment && (
                          <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap", CRED_ENV_BADGE[client.credentialEnvironment])}>
                            {client.credentialEnvironment}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full", ONBOARDED_STATUS_BADGE[client.status])}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", ONBOARDED_STATUS_DOT[client.status])} />
                          {client.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
                        {formatDate(client.onboardingDate)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
                        {formatDate(client.lastApiActivity)}
                      </TableCell>
                      <TableCell>
                        <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap", ACTIVITY_BADGE[client.activityLevel])}>
                          {client.activityLevel}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {client.activeApiKeys}
                          <span className="font-normal text-slate-400 dark:text-slate-500">/{client.totalApiKeys}</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {client.totalInvoices.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {onboardedPagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Page {onboardedPagination.page} of {onboardedPagination.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOnboardedPage((p) => Math.max(1, p - 1))}
                  disabled={onboardedPage <= 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Previous
                </button>
                <button
                  onClick={() => setOnboardedPage((p) => Math.min(onboardedPagination.totalPages, p + 1))}
                  disabled={onboardedPage >= onboardedPagination.totalPages}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      {editingClient && (
        <EditCrmClientModal
          client={editingClient}
          onClose={() => setEditingClient(null)}
          onSaved={(updated) => {
            setCrmClients((prev) => prev.map((c) => c.id === updated.id ? updated : c));
            setEditingClient(null);
          }}
        />
      )}
      {addClientOpen && (
        <AddCrmClientModal
          onClose={() => setAddClientOpen(false)}
          onCreated={(newClient) => {
            setCrmClients((prev) => [newClient, ...prev]);
            setAddClientOpen(false);
          }}
        />
      )}

      {/* ── Dashboard Migration Tracker ── */}
      {activeTab === "migration" && (
        <div className="space-y-4">
          {crmError && (
            <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">
              {crmError}
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Dashboard Clients",  value: migTotal,           color: "border-t-slate-400",   numColor: "text-slate-900 dark:text-slate-100",        textColor: "text-slate-500 dark:text-slate-400" },
              { label: "Live",               value: migLive,            color: "border-t-emerald-500", numColor: "text-emerald-700 dark:text-emerald-400",    textColor: "text-emerald-600 dark:text-emerald-400" },
              { label: "Credentials Ready",  value: migCredReady,       color: "border-t-blue-500",    numColor: "text-blue-700 dark:text-blue-400",          textColor: "text-blue-600 dark:text-blue-400" },
              { label: "Meeting Arranged",   value: migMeetingArranged, color: "border-t-violet-500",  numColor: "text-violet-700 dark:text-violet-400",      textColor: "text-violet-600 dark:text-violet-400" },
            ].map(card => (
              <div key={card.label} className={cn(
                "bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm border-t-[3px]",
                card.color,
              )}>
                <p className={cn("text-3xl font-black tracking-tight", card.numColor)}>{card.value}</p>
                <p className={cn("text-xs font-medium mt-1", card.textColor)}>{card.label}</p>
              </div>
            ))}
          </div>

          {/* Progress bar — live vs pending */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Go-Live Progress</p>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {migLive}/{migTotal} live
              </span>
            </div>
            <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 gap-px">
              <div
                className="h-full bg-emerald-500 transition-all rounded-l-full"
                style={{ width: `${migTotal > 0 ? (migLive / migTotal) * 100 : 0}%` }}
              />
              <div
                className="h-full bg-slate-200 dark:bg-slate-700 transition-all rounded-r-full flex-1"
              />
            </div>
            <div className="flex items-center gap-4 mt-2">
              <span className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                {migLive} Live
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                {migPending} Pending
              </span>
            </div>
          </div>

          {/* Search & filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48 max-w-sm">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search by client name…"
                value={migSearch}
                onChange={e => setMigSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition"
              />
            </div>
            <select
              value={migCredFilter}
              onChange={e => setMigCredFilter(e.target.value as typeof migCredFilter)}
              className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition cursor-pointer"
            >
              <option value="All">All Credentials</option>
              <option value="Yes">Credentials Created</option>
              <option value="No">Credentials Pending</option>
            </select>
            <select
              value={migMeetingFilter}
              onChange={e => setMigMeetingFilter(e.target.value as typeof migMeetingFilter)}
              className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition cursor-pointer"
            >
              <option value="All">All Meetings</option>
              <option value="Yes">Meeting Scheduled</option>
              <option value="Sent Guidelines">Guidelines Sent</option>
              <option value="No">No Meeting</option>
            </select>
            {(migSearch || migCredFilter !== "All" || migMeetingFilter !== "All") && (
              <button
                onClick={() => { setMigSearch(""); setMigCredFilter("All"); setMigMeetingFilter("All"); }}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 px-2 py-2.5 transition-colors"
              >
                Clear all
              </button>
            )}
            <span className="ml-auto text-xs text-slate-400 dark:text-slate-500 font-medium">
              {migFiltered.length} of {migTotal}
            </span>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                <TableRow className="hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-default">
                  <TableHead>Client</TableHead>
                  <TableHead>Go-Live Date</TableHead>
                  <TableHead>Credentials Created</TableHead>
                  <TableHead>Date Issued</TableHead>
                  <TableHead>Scheduled Meeting</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Status Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {crmLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="hover:bg-transparent dark:hover:bg-transparent cursor-default">
                      <TableCell><Skeleton className="h-8 w-36" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    </TableRow>
                  ))
                ) : migFiltered.length === 0 ? (
                  <TableRow className="hover:bg-transparent dark:hover:bg-transparent cursor-default">
                    <TableCell colSpan={7} className="py-16 text-center text-sm text-slate-400 dark:text-slate-500">
                      No clients match the current filters.
                    </TableCell>
                  </TableRow>
                ) : migFiltered.map(client => {
                  const m = client.dashboardMigration;
                  // If linked to a real org, navigate to the org profile; otherwise fall back to CRM id
                  const profilePath = `/clients/${client.platformActivity.linkedOrganizationId ?? client.id}`;
                  return (
                    <TableRow key={client.id} onClick={() => navigate(profilePath)}>

                      {/* Client */}
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm" style={avatarGradient(client.name)}>
                            {client.name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">{client.name}</p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{client.state} · {client.zone}</p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Go-Live Date */}
                      <TableCell>
                        {m.goLiveDate ? (
                          <span className="text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {formatDate(m.goLiveDate)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300 dark:text-slate-600">Not scheduled</span>
                        )}
                      </TableCell>

                      {/* Credentials Created */}
                      <TableCell>
                        <span className={cn(
                          "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border",
                          m.credentialsCreated
                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                        )}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", m.credentialsCreated ? "bg-emerald-500" : "bg-slate-400")} />
                          {m.credentialsCreated ? "Yes" : "No"}
                        </span>
                      </TableCell>

                      {/* Date Credentials Issued */}
                      <TableCell>
                        {m.dateCredentialsIssued ? (
                          <span className="text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {formatDate(m.dateCredentialsIssued)}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                        )}
                      </TableCell>

                      {/* Scheduled Meeting */}
                      <TableCell>
                        <span className={cn(
                          "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border",
                          m.scheduledMeeting === "Yes"
                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                            : m.scheduledMeeting === "Sent Guidelines"
                              ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                        )}>
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            m.scheduledMeeting === "Yes" ? "bg-emerald-500" : m.scheduledMeeting === "Sent Guidelines" ? "bg-blue-500" : "bg-slate-400"
                          )} />
                          {m.scheduledMeeting}
                        </span>
                      </TableCell>

                      {/* Service */}
                      <TableCell>
                        <span className={cn(
                          "text-[11px] font-medium px-2 py-0.5 rounded-full border",
                          SERVICE_BADGE[m.service as ServiceType] ?? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                        )}>
                          {m.service}
                        </span>
                      </TableCell>

                      {/* Status Note */}
                      <TableCell>
                        {m.statusNote ? (
                          <span className={cn(
                            "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border",
                            m.statusNote === "LIVE"
                              ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                              : m.statusNote === "Prompted"
                                ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                          )}>
                            <span className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              m.statusNote === "LIVE" ? "bg-emerald-500" : m.statusNote === "Prompted" ? "bg-amber-400" : "bg-slate-400"
                            )} />
                            {m.statusNote}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
