import { useEffect, useState } from "react";
import { CheckCircleIcon, LockClosedIcon, NoSymbolIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface SystemRole {
  key: string;
  name: string;
  version: number;
  assignable: boolean;
  description: string;
  permissions: string[];
  restrictions?: string[];
}

export default function SystemRolesPanel() {
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ status: string; data: { roles: SystemRole[] } }>("/admin/system-roles")
      .then((result) => setRoles(result.data.roles))
      .catch((error) => toast.error(error instanceof Error ? error.message : "Unable to load roles"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="mt-8 text-sm text-slate-500">Loading configured roles…</p>;

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
        Roles are secure presets enforced by the backend. Assign a Version 1 role when creating or editing a user; Version 2 roles are shown for planning only.
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {roles.map((role) => (
          <article key={role.key} className={`rounded-2xl border p-5 ${role.assignable ? "border-slate-200 dark:border-slate-800" : "border-dashed border-slate-200 bg-slate-50/60 opacity-75 dark:border-slate-800 dark:bg-slate-950/30"}`}>
            <div className="flex items-start justify-between gap-4">
              <div><h3 className="font-bold text-slate-900 dark:text-white">{role.name}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{role.description}</p></div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${role.assignable ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-slate-200 text-slate-500 dark:bg-slate-800"}`}>{role.assignable ? "Assignable" : `Version ${role.version}`}</span>
            </div>
            {role.permissions.length > 0 && <div className="mt-4 space-y-2">{role.permissions.map((permission) => <div key={permission} className="flex gap-2 text-xs text-slate-600 dark:text-slate-300"><CheckCircleIcon className="h-4 w-4 shrink-0 text-emerald-500"/><span>{permission}</span></div>)}</div>}
            {role.restrictions && <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800"><p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400"><LockClosedIcon className="h-3.5 w-3.5"/>Restrictions</p>{role.restrictions.map((restriction) => <div key={restriction} className="mt-2 flex gap-2 text-xs text-slate-500"><NoSymbolIcon className="h-4 w-4 shrink-0 text-red-400"/><span>{restriction}</span></div>)}</div>}
          </article>
        ))}
      </div>
    </div>
  );
}
