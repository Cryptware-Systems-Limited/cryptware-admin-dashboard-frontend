import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Client } from "@/data/clients";

interface EditCrmClientModalProps {
  client: Client;
  onClose: () => void;
  onSaved: (updated: Client) => void;
}

const FIELD_CLASS =
  "w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition";

const LABEL_CLASS = "block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide";

export default function EditCrmClientModal({ client, onClose, onSaved }: EditCrmClientModalProps) {
  const m = client.dashboardMigration;

  const projectStatusToDb: Record<string, string> = {
    Live: "LIVE", "In Progress": "IN_PROGRESS", Blocked: "BLOCKED", "Not Started": "NOT_STARTED",
  };
  const meetingToDb: Record<string, string> = {
    Yes: "YES", No: "NO", "Sent Guidelines": "SENT_GUIDELINES",
  };
  const bandToDb: Record<string, string> = {
    Large: "LARGE", Medium: "MEDIUM", Small: "SMALL",
  };

  const [form, setForm] = useState({
    ragStatus:            client.ragStatus,
    projectStatus:        projectStatusToDb[client.projectStatus] ?? client.projectStatus,
    activityNote:         client.activityNote,
    goLiveDate:           m.goLiveDate ?? "",
    credentialsCreated:   m.credentialsCreated,
    dateCredentialsIssued: m.dateCredentialsIssued ?? "",
    scheduledMeeting:     meetingToDb[m.scheduledMeeting] ?? m.scheduledMeeting,
    migrationService:     m.service,
    migrationStatusNote:  m.statusNote,
    erpSystem:            client.erpSystem,
    sector:               client.sector,
    nrsStatus:            client.nrsStatus,
    turnoverBand:         bandToDb[client.turnoverBand] ?? client.turnoverBand,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        ragStatus:            form.ragStatus,
        projectStatus:        form.projectStatus,
        activityNote:         form.activityNote,
        goLiveDate:           form.goLiveDate || null,
        credentialsCreated:   form.credentialsCreated,
        dateCredentialsIssued: form.dateCredentialsIssued || null,
        scheduledMeeting:     form.scheduledMeeting,
        migrationService:     form.migrationService,
        migrationStatusNote:  form.migrationStatusNote,
        erpSystem:            form.erpSystem,
        sector:               form.sector,
        nrsStatus:            form.nrsStatus,
        turnoverBand:         form.turnoverBand,
      };

      const res = await api.put<{ status: string; data: Client }>(`/admin/crm/clients/${client.id}`, payload);
      onSaved(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Edit CRM Client</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{client.name} · {client.tin}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <XMarkIcon className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Status row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLASS}>Project Status</label>
              <select
                value={form.projectStatus}
                onChange={(e) => set("projectStatus", e.target.value)}
                className={FIELD_CLASS}
              >
                <option value="LIVE">Live</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="BLOCKED">Blocked</option>
                <option value="NOT_STARTED">Not Started</option>
              </select>
            </div>
            <div>
              <label className={LABEL_CLASS}>RAG Status</label>
              <select
                value={form.ragStatus}
                onChange={(e) => set("ragStatus", e.target.value as typeof form.ragStatus)}
                className={FIELD_CLASS}
              >
                <option value="GREEN">Green — On Track</option>
                <option value="AMBER">Amber — At Risk</option>
                <option value="RED">Red — Critical</option>
                <option value="PENDING">Pending — No Kickoff</option>
              </select>
            </div>
          </div>

          {/* Activity note */}
          <div>
            <label className={LABEL_CLASS}>Latest Activity Note</label>
            <textarea
              rows={3}
              value={form.activityNote}
              onChange={(e) => set("activityNote", e.target.value)}
              className={cn(FIELD_CLASS, "resize-none")}
              placeholder="Brief update on current status…"
            />
          </div>

          {/* Migration section */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Dashboard Migration</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLASS}>Go-Live Date</label>
                <input
                  type="date"
                  value={form.goLiveDate}
                  onChange={(e) => set("goLiveDate", e.target.value)}
                  className={FIELD_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Date Credentials Issued</label>
                <input
                  type="date"
                  value={form.dateCredentialsIssued}
                  onChange={(e) => set("dateCredentialsIssued", e.target.value)}
                  className={FIELD_CLASS}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className={LABEL_CLASS}>Scheduled Meeting</label>
                <select
                  value={form.scheduledMeeting}
                  onChange={(e) => set("scheduledMeeting", e.target.value)}
                  className={FIELD_CLASS}
                >
                  <option value="YES">Yes</option>
                  <option value="NO">No</option>
                  <option value="SENT_GUIDELINES">Sent Guidelines</option>
                </select>
              </div>
              <div>
                <label className={LABEL_CLASS}>Migration Status Note</label>
                <input
                  type="text"
                  value={form.migrationStatusNote}
                  onChange={(e) => set("migrationStatusNote", e.target.value)}
                  className={FIELD_CLASS}
                  placeholder="e.g. LIVE, Prompted, Pending…"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className={LABEL_CLASS}>Migration Service</label>
              <input
                type="text"
                value={form.migrationService}
                onChange={(e) => set("migrationService", e.target.value)}
                className={FIELD_CLASS}
                placeholder="e.g. Dashboard, ERP End-to-End…"
              />
            </div>

            <div className="flex items-center gap-3 mt-4 px-3 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <input
                type="checkbox"
                id="credentialsCreated"
                checked={form.credentialsCreated}
                onChange={(e) => set("credentialsCreated", e.target.checked)}
                className="w-4 h-4 rounded accent-orange-600"
              />
              <label htmlFor="credentialsCreated" className="text-sm text-slate-700 dark:text-slate-300 select-none cursor-pointer">
                Credentials created and ready to share
              </label>
            </div>
          </div>

          {/* Client details */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Client Details</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLASS}>ERP System</label>
                <input
                  type="text"
                  value={form.erpSystem}
                  onChange={(e) => set("erpSystem", e.target.value)}
                  className={FIELD_CLASS}
                  placeholder="e.g. SAP, Oracle, None…"
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Sector</label>
                <input
                  type="text"
                  value={form.sector}
                  onChange={(e) => set("sector", e.target.value)}
                  className={FIELD_CLASS}
                  placeholder="e.g. Banking & Finance"
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>NRS Status</label>
                <input
                  type="text"
                  value={form.nrsStatus}
                  onChange={(e) => set("nrsStatus", e.target.value)}
                  className={FIELD_CLASS}
                  placeholder="e.g. Registered, Pending"
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Turnover Band</label>
                <select
                  value={form.turnoverBand}
                  onChange={(e) => set("turnoverBand", e.target.value)}
                  className={FIELD_CLASS}
                >
                  <option value="LARGE">Large</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="SMALL">Small</option>
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
