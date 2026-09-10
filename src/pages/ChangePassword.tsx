import { useState, type FormEvent } from "react";
import { EyeIcon, EyeSlashIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function ChangePassword() {
  const { logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError("Your new password must contain at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/change-password", { oldPassword: currentPassword, newPassword });
      logout();
      window.location.assign("/login?passwordChanged=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to change your password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      <div className="relative w-full max-w-sm">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-lg font-black text-white shadow-lg shadow-orange-500/25">CW</div>
          <h1 className="text-2xl font-bold text-white">Create a new password</h1>
          <p className="mt-1 text-sm text-slate-400">Change your temporary password before continuing.</p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-800">
              <LockClosedIcon className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Password security</p>
              <p className="text-xs text-slate-400">You will sign in again after changing it.</p>
            </div>
          </div>

          {[
            { label: "Current password", value: currentPassword, setValue: setCurrentPassword, autoComplete: "current-password" },
            { label: "New password", value: newPassword, setValue: setNewPassword, autoComplete: "new-password" },
            { label: "Confirm new password", value: confirmPassword, setValue: setConfirmPassword, autoComplete: "new-password" },
          ].map((field) => (
            <label key={field.label} className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-300">{field.label}</span>
              <div className="relative">
                <input
                  required
                  type={showPasswords ? "text" : "password"}
                  autoComplete={field.autoComplete}
                  value={field.value}
                  onChange={(event) => field.setValue(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 pr-10 text-sm text-white outline-none transition focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/30"
                />
                <button type="button" onClick={() => setShowPasswords((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white" aria-label={showPasswords ? "Hide passwords" : "Show passwords"}>
                  {showPasswords ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
            </label>
          ))}

          {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs text-red-400">{error}</div>}

          <button disabled={loading} className="w-full rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? "Changing password…" : "Change password"}
          </button>
        </form>
      </div>
    </div>
  );
}
