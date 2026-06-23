import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
  icon: ReactNode;
  accent?: "orange" | "navy" | "green" | "yellow" | "red";
}

const accentMap = {
  orange: "bg-orange-50 dark:bg-orange-500/10 text-orange-600 border-orange-100 dark:border-orange-500/20",
  navy:   "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600",
  green:  "bg-green-50 dark:bg-green-500/10 text-green-600 border-green-100 dark:border-green-500/20",
  yellow: "bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 border-yellow-100 dark:border-yellow-500/20",
  red:    "bg-red-50 dark:bg-red-500/10 text-red-600 border-red-100 dark:border-red-500/20",
};

export default function StatCard({ label, value, change, positive, icon, accent = "orange" }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md dark:hover:shadow-slate-900/50 transition-shadow duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-2.5 rounded-xl border", accentMap[accent])}>
          {icon}
        </div>
        {change && (
          <span className={cn(
            "text-xs font-semibold px-2 py-0.5 rounded-full",
            positive
              ? "bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400"
              : "bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400"
          )}>
            {change}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{value}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}
