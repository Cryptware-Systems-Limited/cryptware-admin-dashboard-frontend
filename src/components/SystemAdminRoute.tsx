import { Link } from "react-router-dom";
import { ShieldExclamationIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/context/AuthContext";

export default function SystemAdminRoute({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();

  if (role !== "SYSTEM_ADMIN") {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-500/10">
            <ShieldExclamationIcon className="h-7 w-7 text-red-600 dark:text-red-400" />
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-red-500">Access denied</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">System Administrator access required</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
            Admin Settings contains platform-wide controls. Only users with the System Administrator role can open this page.
          </p>
          <Link
            to="/overview"
            className="mt-6 inline-flex rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700"
          >
            Return to Overview
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
