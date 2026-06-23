import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  MagnifyingGlassIcon,
  ChevronUpDownIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { MOCK_CLIENTS, type Client, type ProjectStatus, type RAGStatus, type ServiceType } from "@/data/clients";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
type SortField = "name" | "erpSystem" | "projectStatus" | "ragStatus";
type SortDir = "asc" | "desc";
type ActiveTab = "master" | "migration";

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

function SortIcon({ field, active, dir }: { field: SortField; active: SortField; dir: SortDir }) {
  if (field !== active) return <ChevronUpDownIcon className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 ml-1 inline" />;
  return dir === "asc"
    ? <ChevronUpIcon className="w-3.5 h-3.5 text-orange-500 ml-1 inline" />
    : <ChevronDownIcon className="w-3.5 h-3.5 text-orange-500 ml-1 inline" />;
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Clients() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "All">("All");
  const [serviceFilter, setServiceFilter] = useState<ServiceType | "All">("All");
  const [ragFilter, setRagFilter] = useState<RAGStatus | "All">("All");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [activeTab, setActiveTab] = useState<ActiveTab>("master");

  // ── Stats ──────────────────────────────────────────────────────────────────
  const total      = MOCK_CLIENTS.length;
  const live       = MOCK_CLIENTS.filter((c) => c.projectStatus === "Live").length;
  const inProgress = MOCK_CLIENTS.filter((c) => c.projectStatus === "In Progress").length;
  const blocked    = MOCK_CLIENTS.filter((c) => c.projectStatus === "Blocked").length;
  const notStarted = MOCK_CLIENTS.filter((c) => c.projectStatus === "Not Started").length;

  const ragCounts: Record<RAGStatus, number> = {
    GREEN:   MOCK_CLIENTS.filter((c) => c.ragStatus === "GREEN").length,
    AMBER:   MOCK_CLIENTS.filter((c) => c.ragStatus === "AMBER").length,
    RED:     MOCK_CLIENTS.filter((c) => c.ragStatus === "RED").length,
    PENDING: MOCK_CLIENTS.filter((c) => c.ragStatus === "PENDING").length,
  };

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo<Client[]>(() => {
    let list = MOCK_CLIENTS;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.tin.includes(q));
    }
    if (statusFilter !== "All")  list = list.filter((c) => c.projectStatus === statusFilter);
    if (serviceFilter !== "All") list = list.filter((c) => c.serviceTypes.includes(serviceFilter));
    if (ragFilter !== "All")     list = list.filter((c) => c.ragStatus === ragFilter);
    return [...list].sort((a, b) => {
      const cmp = String(a[sortField] ?? "").localeCompare(String(b[sortField] ?? ""));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [search, statusFilter, serviceFilter, ragFilter, sortField, sortDir]);

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
            {total} clients across all implementation stages
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 active:scale-95 transition-all shadow-sm shadow-orange-600/20">
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
        {(["master", "migration"] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
              activeTab === tab
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            {tab === "master" ? "Client Master List" : "Dashboard Migration"}
          </button>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
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

        {/* Status filter */}
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

        {/* Service filter */}
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

        {(statusFilter !== "All" || serviceFilter !== "All" || ragFilter !== "All" || search) && (
          <button
            onClick={() => { setSearch(""); setStatusFilter("All"); setServiceFilter("All"); setRagFilter("All"); }}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 px-2 py-2.5 transition-colors"
          >
            Clear all
          </button>
        )}

        <span className="ml-auto text-xs text-slate-400 dark:text-slate-500 font-medium">
          {filtered.length} of {total}
        </span>
      </div>

      {/* ── Master List Table ── */}
      {activeTab === "master" && (
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
              {filtered.length === 0 ? (
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

                    {/* Arrow */}
                    <TableCell className="text-right">
                      <span className="text-xs text-orange-500 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                        →
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Dashboard Migration Tracker ── */}
      {activeTab === "migration" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Dashboard Migration Tracker</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Credential issuance and go-live readiness</p>
          </div>
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
              <TableRow className="hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-default">
                <TableHead>Client</TableHead>
                <TableHead>Go-Live Date</TableHead>
                <TableHead>Credentials</TableHead>
                <TableHead>Date Issued</TableHead>
                <TableHead>Meeting</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Status Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_CLIENTS.filter((c) => c.serviceTypes.includes("Dashboard")).map((client) => {
                const m = client.dashboardMigration;
                return (
                  <TableRow key={client.id} onClick={() => navigate(`/clients/${client.id}`)}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style={avatarGradient(client.name)}>
                          {client.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">{client.name}</p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500">{client.state}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                      {m.goLiveDate ?? <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "text-[11px] font-semibold px-2.5 py-1 rounded-full border",
                        m.credentialsCreated
                          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                      )}>
                        {m.credentialsCreated ? "Yes" : "No"}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                      {m.dateCredentialsIssued ?? <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "text-[11px] font-medium px-2.5 py-1 rounded-full border",
                        m.scheduledMeeting === "Yes"
                          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                          : m.scheduledMeeting === "Sent Guidelines"
                          ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                      )}>
                        {m.scheduledMeeting}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full border", SERVICE_BADGE[m.service as ServiceType] ?? "bg-slate-100 text-slate-600")}>
                        {m.service}
                      </span>
                    </TableCell>
                    <TableCell>
                      {m.statusNote ? (
                        <span className={cn(
                          "text-[11px] font-semibold px-2.5 py-1 rounded-full border",
                          m.statusNote === "LIVE"
                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                        )}>
                          {m.statusNote}
                        </span>
                      ) : <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
