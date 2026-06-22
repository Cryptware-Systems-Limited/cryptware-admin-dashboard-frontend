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
  orange: "bg-orange-50 text-orange-600 border-orange-100",
  navy: "bg-slate-100 text-slate-700 border-slate-200",
  green: "bg-green-50 text-green-600 border-green-100",
  yellow: "bg-yellow-50 text-yellow-600 border-yellow-100",
  red: "bg-red-50 text-red-600 border-red-100",
};

export default function StatCard({ label, value, change, positive, icon, accent = "orange" }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-2.5 rounded-xl border", accentMap[accent])}>
          {icon}
        </div>
        {change && (
          <span className={cn(
            "text-xs font-semibold px-2 py-0.5 rounded-full",
            positive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
          )}>
            {change}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
      <p className="text-sm text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}
