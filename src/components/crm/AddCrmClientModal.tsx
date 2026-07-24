import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Client, ServiceType } from "@/data/clients";

interface AddCrmClientModalProps {
  onClose: () => void;
  onCreated: (client: Client) => void;
}

const FIELD_CLASS =
  "w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition";

const LABEL_CLASS = "block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide";

const ALL_SERVICE_TYPES: ServiceType[] = ["Dashboard", "ERP Support", "ERP End-to-End", "Combined"];

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo",
  "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa",
  "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba",
  "Yobe", "Zamfara",
];

const ZONES: Record<string, string> = {
  "Abia": "South East", "Anambra": "South East", "Ebonyi": "South East", "Enugu": "South East", "Imo": "South East",
  "Akwa Ibom": "South South", "Bayelsa": "South South", "Cross River": "South South", "Delta": "South South", "Edo": "South South", "Rivers": "South South",
  "Ekiti": "South West", "Lagos": "South West", "Ogun": "South West", "Ondo": "South West", "Osun": "South West", "Oyo": "South West",
  "Benue": "North Central", "FCT": "North Central", "Kogi": "North Central", "Kwara": "North Central", "Nasarawa": "North Central", "Niger": "North Central", "Plateau": "North Central",
  "Adamawa": "North East", "Bauchi": "North East", "Borno": "North East", "Gombe": "North East", "Taraba": "North East", "Yobe": "North East",
  "Jigawa": "North West", "Kaduna": "North West", "Kano": "North West", "Katsina": "North West", "Kebbi": "North West", "Sokoto": "North West", "Zamfara": "North West",
};

export default function AddCrmClientModal({ onClose, onCreated }: AddCrmClientModalProps) {
  const [form, setForm] = useState({
    name: "",
    tin: "",
    state: "Lagos",
    sector: "",
    erpSystem: "",
    serviceTypes: [] as ServiceType[],
    turnoverBand: "Medium",
    nrsStatus: "Registered",
    projectStatus: "Not Started",
    ragStatus: "PENDING",
    activityNote: "",
    scheduledMeeting: "No",
    credentialsCreated: false,
    goLiveDate: "",
    dateCredentialsIssued: "",
    migrationService: "",
    migrationStatusNote: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleServiceType(type: ServiceType) {
    setForm((prev) => {
      const has = prev.serviceTypes.includes(type);
      return {
        ...prev,
        serviceTypes: has
          ? prev.serviceTypes.filter((t) => t !== type)
          : [...prev.serviceTypes, type],
      };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.tin.trim()) {
      setError("Name and TIN are required");
      return;
    }
    if (form.serviceTypes.length === 0) {
      setError("Please select at least one service type");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const zone = ZONES[form.state] ?? "Unknown";
      const payload = {
        name: form.name.trim(),
        tin: form.tin.trim(),
        state: form.state,
        zone,
        sector: form.sector,
        erpSystem: form.erpSystem || "Unknown",
        serviceTypes: form.serviceTypes,
        turnoverBand: form.turnoverBand,
        nrsStatus: form.nrsStatus,
        projectStatus: form.projectStatus,
        ragStatus: form.ragStatus,
        activityNote: form.activityNote,
        scheduledMeeting: form.scheduledMeeting,
        credentialsCreated: form.credentialsCreated,
        goLiveDate: form.goLiveDate || null,
        dateCredentialsIssued: form.dateCredentialsIssued || null,
        migrationService: form.migrationService,
        migrationStatusNote: form.migrationStatusNote,
      };

      const res = await api.post<{ status: string; data: Client }>("/admin/crm/clients", payload);
      onCreated(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create client");
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
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Add CRM Client</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Add a new prospect or client to the tracker</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <XMarkIcon className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Identity */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={LABEL_CLASS}>Company Name <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={FIELD_CLASS}
                placeholder="e.g. Dangote Industries Ltd"
                required
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>TIN <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={form.tin}
                onChange={(e) => set("tin", e.target.value)}
                className={FIELD_CLASS}
                placeholder="e.g. 10234567-0001"
                required
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>State</label>
              <select value={form.state} onChange={(e) => set("state", e.target.value)} className={FIELD_CLASS}>
                {NIGERIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Service types */}
          <div>
            <label className={LABEL_CLASS}>Service Types <span className="text-red-400">*</span></label>
            <div className="flex flex-wrap gap-2 mt-1">
              {ALL_SERVICE_TYPES.map((type) => {
                const active = form.serviceTypes.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleServiceType(type)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg border text-xs font-medium transition",
                      active
                        ? "bg-orange-600 border-orange-600 text-white"
                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-orange-400"
                    )}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Details row */}
          <div className="grid grid-cols-2 gap-4">
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
              <label className={LABEL_CLASS}>ERP System</label>
              <input
                type="text"
                value={form.erpSystem}
                onChange={(e) => set("erpSystem", e.target.value)}
                className={FIELD_CLASS}
                placeholder="e.g. SAP, Oracle, None"
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Turnover Band</label>
              <select value={form.turnoverBand} onChange={(e) => set("turnoverBand", e.target.value)} className={FIELD_CLASS}>
                <option value="Large">Large</option>
                <option value="Medium">Medium</option>
                <option value="Small">Small</option>
              </select>
            </div>
            <div>
              <label className={LABEL_CLASS}>NRS Status</label>
              <select value={form.nrsStatus} onChange={(e) => set("nrsStatus", e.target.value)} className={FIELD_CLASS}>
                <option value="Registered">Registered</option>
                <option value="Pending">Pending</option>
                <option value="Not Registered">Not Registered</option>
              </select>
            </div>
          </div>

          {/* Status */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Project Status</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLASS}>Project Status</label>
                <select value={form.projectStatus} onChange={(e) => set("projectStatus", e.target.value)} className={FIELD_CLASS}>
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Live">Live</option>
                  <option value="Blocked">Blocked</option>
                </select>
              </div>
              <div>
                <label className={LABEL_CLASS}>RAG Status</label>
                <select value={form.ragStatus} onChange={(e) => set("ragStatus", e.target.value)} className={FIELD_CLASS}>
                  <option value="PENDING">Pending — No Kickoff</option>
                  <option value="GREEN">Green — On Track</option>
                  <option value="AMBER">Amber — At Risk</option>
                  <option value="RED">Red — Critical</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className={LABEL_CLASS}>Activity Note</label>
              <textarea
                rows={2}
                value={form.activityNote}
                onChange={(e) => set("activityNote", e.target.value)}
                className={cn(FIELD_CLASS, "resize-none")}
                placeholder="Initial notes on this client…"
              />
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
            {loading ? "Creating…" : "Add Client"}
          </button>
        </div>
      </div>
    </div>
  );
}