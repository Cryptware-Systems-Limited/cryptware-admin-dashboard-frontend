import { useEffect, useState } from "react";
import { BellAlertIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { api } from "@/lib/api";

type RecipientRole = "SYSTEM_ADMIN" | "SYSTEM_DEVELOPER";
type NotificationCategory = "CLIENT" | "INVOICE" | "REPORT" | "ENTERPRISE_LEAD";
interface NotificationConfiguration { type: string; category: NotificationCategory; label: string; description: string; enabled: boolean; recipientRoles: RecipientRole[]; updatedAt: string | null; }

const CATEGORY_LABEL: Record<NotificationCategory, string> = { CLIENT: "Clients", INVOICE: "Invoice Monitoring", REPORT: "Reports", ENTERPRISE_LEAD: "Enterprise" };
const CATEGORIES = Object.keys(CATEGORY_LABEL) as NotificationCategory[];
const ROLE_LABEL: Record<RecipientRole, string> = { SYSTEM_ADMIN: "System Administrator", SYSTEM_DEVELOPER: "Customer Support" };

export default function NotificationSettingsPanel() {
  const [items, setItems] = useState<NotificationConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingType, setSavingType] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<NotificationCategory>("CLIENT");

  useEffect(() => {
    let active = true;
    api.get<{ status: string; data: { configurations: NotificationConfiguration[] } }>("/admin/notification-settings")
      .then((result) => { if (active) setItems(result.data.configurations); })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Unable to load notification settings"))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function save(item: NotificationConfiguration, next: Partial<Pick<NotificationConfiguration, "enabled" | "recipientRoles">>) {
    const updated = { ...item, ...next };
    if (updated.recipientRoles.length === 0) { toast.error("Select at least one recipient role"); return; }
    setSavingType(item.type);
    setItems((current) => current.map((entry) => entry.type === item.type ? updated : entry));
    try {
      await api.put(`/admin/notification-settings/${item.type}`, { enabled: updated.enabled, recipientRoles: updated.recipientRoles });
      toast.success(`${item.label} settings saved`);
    } catch (error) {
      setItems((current) => current.map((entry) => entry.type === item.type ? item : entry));
      toast.error(error instanceof Error ? error.message : "Unable to save notification settings");
    } finally { setSavingType(null); }
  }

  if (loading) return <p className="mt-8 text-sm text-slate-500">Loading notification settings...</p>;
  const categoryItems = items.filter((item) => item.category === activeCategory);

  return (
    <div className="mt-7 space-y-6">
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
        These controls affect new in-app notifications only. Notifications already delivered will remain in each user's notification centre.
      </div>

      <div className="overflow-x-auto border-b border-slate-200 dark:border-slate-800">
        <div className="flex min-w-max gap-1" role="tablist" aria-label="Notification categories">
          {CATEGORIES.map((category) => {
            const entries = items.filter((item) => item.category === category);
            const enabled = entries.filter((item) => item.enabled).length;
            const active = activeCategory === category;
            return (
              <button key={category} type="button" role="tab" aria-selected={active} onClick={() => setActiveCategory(category)} className={`relative px-4 py-3 text-sm font-semibold transition ${active ? "text-orange-600 dark:text-orange-400" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}>
                {CATEGORY_LABEL[category]}
                <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] ${active ? "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>{enabled}/{entries.length}</span>
                {active && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-orange-600" />}
              </button>
            );
          })}
        </div>
      </div>

      <section role="tabpanel">
        <div className="mb-3 flex items-center gap-2">
          <BellAlertIcon className="h-5 w-5 text-orange-500" />
          <h3 className="font-bold text-slate-900 dark:text-white">{CATEGORY_LABEL[activeCategory]}</h3>
          <span className="text-xs text-slate-400">{categoryItems.filter((item) => item.enabled).length}/{categoryItems.length} enabled</span>
        </div>
        <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {categoryItems.map((item) => (
            <div key={item.type} className="p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-2"><p className="text-sm font-bold text-slate-900 dark:text-white">{item.label}</p>{savingType === item.type && <span className="text-[10px] text-orange-500">Saving...</span>}</div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
                </div>
                <button type="button" role="switch" aria-checked={item.enabled} aria-label={`${item.enabled ? "Disable" : "Enable"} ${item.label}`} onClick={() => void save(item, { enabled: !item.enabled })} className={`relative h-7 w-12 shrink-0 rounded-full transition ${item.enabled ? "bg-orange-600" : "bg-slate-300 dark:bg-slate-700"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${item.enabled ? "left-6" : "left-1"}`} /></button>
              </div>
              <div className={`mt-4 flex flex-wrap gap-2 transition ${item.enabled ? "opacity-100" : "opacity-50"}`}>
                {(Object.keys(ROLE_LABEL) as RecipientRole[]).map((role) => {
                  const selected = item.recipientRoles.includes(role);
                  const recipients = selected ? item.recipientRoles.filter((value) => value !== role) : [...item.recipientRoles, role];
                  return <button key={role} type="button" disabled={!item.enabled} onClick={() => void save(item, { recipientRoles: recipients })} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${selected ? "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-400" : "border-slate-200 text-slate-500 dark:border-slate-700"}`}><CheckCircleIcon className={`h-4 w-4 ${selected ? "opacity-100" : "opacity-30"}`} />{ROLE_LABEL[role]}</button>;
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
