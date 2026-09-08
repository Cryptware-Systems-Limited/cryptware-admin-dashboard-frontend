import { useCallback, useEffect, useMemo, useState } from "react";
import { MagnifyingGlassIcon, PencilSquareIcon, PlusIcon, ArrowPathIcon, PowerIcon, KeyIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { api } from "@/lib/api";

type SystemRole = "SYSTEM_ADMIN" | "SYSTEM_DEVELOPER" | "SYSTEM_VIEWER";
interface SystemUser { id: string; fullName: string | null; email: string; role: SystemRole; isActive: boolean; lastLoginAt: string | null; createdAt: string; }
interface UsersResponse { status: string; data: { users: SystemUser[]; total: number } }
interface UserResponse { status: string; data: SystemUser }

const ROLE_LABEL: Record<SystemRole, string> = {
  SYSTEM_ADMIN: "System Administrator",
  SYSTEM_DEVELOPER: "Customer Support",
  SYSTEM_VIEWER: "Viewer (legacy)",
};

function date(value: string | null) {
  return value ? new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "Never";
}

export default function SystemUsersPanel() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<SystemUser | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (role !== "all") params.set("role", role);
      if (status !== "all") params.set("status", status);
      const result = await api.get<UsersResponse>(`/admin/system-users?${params}`);
      setUsers(result.data.users);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to load users"); }
    finally { setLoading(false); }
  }, [role, search, status]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 250); return () => window.clearTimeout(timer); }, [load]);
  const activeCount = useMemo(() => users.filter((user) => user.isActive).length, [users]);

  async function save(form: HTMLFormElement) {
    const data = new FormData(form);
    const payload = { fullName: String(data.get("fullName") ?? ""), email: String(data.get("email") ?? ""), role: String(data.get("role") ?? "") };
    setSaving(true);
    try {
      if (editing) await api.put<UserResponse>(`/admin/system-users/${editing.id}`, payload);
      else await api.post<UserResponse>("/admin/system-users", payload);
      toast.success(editing ? "User updated" : "User created and invitation sent");
      setEditing(undefined); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save user"); }
    finally { setSaving(false); }
  }

  async function toggle(user: SystemUser) {
    const action = user.isActive ? "deactivate" : "reactivate";
    if (!window.confirm(`Are you sure you want to ${action} ${user.fullName || user.email}?`)) return;
    try {
      await api.patch<UserResponse>(`/admin/system-users/${user.id}/status`, { isActive: !user.isActive });
      toast.success(`User ${action === "deactivate" ? "deactivated" : "reactivated"}`); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : `Unable to ${action} user`); }
  }

  async function reset(user: SystemUser) {
    if (!window.confirm(`Send password reset instructions to ${user.email}?`)) return;
    try { await api.post(`/admin/system-users/${user.id}/reset-password`); toast.success("Password reset instructions sent"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Unable to send password reset"); }
  }

  return (
    <div className="mt-7 space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {[['Total administrators', users.length], ['Active', activeCount], ['Inactive', users.length - activeCount]].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{value}</p></div>
        ))}
      </div>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative min-w-0 flex-1"><MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-950"/></div>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"><option value="all">All roles</option>{Object.entries(ROLE_LABEL).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
        <button onClick={() => setEditing(null)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700"><PlusIcon className="h-4 w-4"/>Add user</button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950/50"><tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Last login</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">{loading ? <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500"><ArrowPathIcon className="mx-auto mb-2 h-5 w-5 animate-spin"/>Loading users…</td></tr> : users.length === 0 ? <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">No system users match these filters.</td></tr> : users.map((user) => <tr key={user.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30"><td className="px-4 py-3"><p className="font-semibold text-slate-900 dark:text-white">{user.fullName || "Name not set"}</p><p className="text-xs text-slate-500">{user.email}</p></td><td className="px-4 py-3">{ROLE_LABEL[user.role]}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>{user.isActive ? 'Active' : 'Inactive'}</span></td><td className="px-4 py-3 text-slate-500">{date(user.lastLoginAt)}</td><td className="px-4 py-3"><div className="flex justify-end gap-1"><button title="Edit user" onClick={() => setEditing(user)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800"><PencilSquareIcon className="h-4 w-4"/></button><button title="Reset password" onClick={() => void reset(user)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-orange-600 dark:hover:bg-slate-800"><KeyIcon className="h-4 w-4"/></button><button title={user.isActive ? 'Deactivate' : 'Reactivate'} onClick={() => void toggle(user)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800"><PowerIcon className="h-4 w-4"/></button></div></td></tr>)}</tbody>
        </table>
      </div>
      {editing !== undefined && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"><div className="flex items-center justify-between"><h3 className="text-lg font-bold text-slate-900 dark:text-white">{editing ? 'Edit user' : 'Add system user'}</h3><button onClick={() => setEditing(undefined)}><XMarkIcon className="h-5 w-5 text-slate-400"/></button></div><form className="mt-5 space-y-4" onSubmit={(e) => { e.preventDefault(); void save(e.currentTarget); }}><label className="block text-sm font-medium">Full name<input name="fullName" required defaultValue={editing?.fullName ?? ''} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 outline-none focus:border-orange-500 dark:border-slate-700"/></label><label className="block text-sm font-medium">Email address<input name="email" type="email" required defaultValue={editing?.email ?? ''} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 outline-none focus:border-orange-500 dark:border-slate-700"/></label><label className="block text-sm font-medium">Role<select name="role" required defaultValue={editing?.role === 'SYSTEM_VIEWER' ? 'SYSTEM_DEVELOPER' : editing?.role ?? 'SYSTEM_DEVELOPER'} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950"><option value="SYSTEM_ADMIN">System Administrator</option><option value="SYSTEM_DEVELOPER">Customer Support</option></select></label><div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setEditing(undefined)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold dark:border-slate-700">Cancel</button><button disabled={saving} className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Saving…' : editing ? 'Save changes' : 'Create user'}</button></div></form></div></div>}
    </div>
  );
}
