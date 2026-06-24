import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
} from "@heroicons/react/24/outline";
import { MOCK_CLIENTS, type Client, type ProjectStatus, type RAGStatus } from "@/data/clients";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

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
  Live:          "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20",
  "In Progress": "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20",
  Blocked:       "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20",
  "Not Started": "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700",
};

const ACCOUNT_BADGE: Record<string, string> = {
  Active:    "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20",
  Suspended: "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20",
  Deleted:   "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700",
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

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ClientProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canWrite, canSuspend } = useAuth();

  const original = MOCK_CLIENTS.find((c) => c.id === id);
  const [client, setClient] = useState<Client | undefined>(original);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <p className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">Client not found</p>
        <p className="text-sm mb-4">No client with ID: {id}</p>
        <button onClick={() => navigate("/clients")} className="text-sm text-orange-600 font-semibold hover:underline">
          ← Back to Clients
        </button>
      </div>
    );
  }

  const rag = RAG_CONFIG[client.ragStatus];
  const isSuspended = client.platformActivity.accountStatus === "Suspended";

  return (
    <div className="space-y-5 max-w-5xl">

      {/* ── Back ── */}
      <button
        onClick={() => navigate("/clients")}
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
                  This client is currently <strong>suspended</strong>. All users receive a 403 on login with instructions to contact <span className="font-mono">support@cryptwaresystems.com</span>.
                </p>
              </div>
            )}
          </div>
        )}
      </SectionCard>

    </div>
  );
}
