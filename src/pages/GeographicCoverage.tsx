import { GlobeAltIcon } from "@heroicons/react/24/outline";

const regions = [
  { name: "Lagos", clients: 842, invoices: 4120, revenue: "₦28.4M", coverage: 88 },
  { name: "Abuja", clients: 410, invoices: 2090, revenue: "₦15.1M", coverage: 74 },
  { name: "Port Harcourt", clients: 318, invoices: 1540, revenue: "₦11.3M", coverage: 62 },
  { name: "Kano", clients: 241, invoices: 980, revenue: "₦7.2M", coverage: 48 },
  { name: "Ibadan", clients: 187, invoices: 760, revenue: "₦4.9M", coverage: 39 },
  { name: "Enugu", clients: 143, invoices: 590, revenue: "₦3.5M", coverage: 30 },
  { name: "Benin City", clients: 112, invoices: 430, revenue: "₦2.8M", coverage: 24 },
  { name: "Kaduna", clients: 98, invoices: 380, revenue: "₦2.3M", coverage: 19 },
];

export default function GeographicCoverage() {
  const total = regions.reduce((s, r) => s + r.clients, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Active Regions", value: "8" },
          { label: "Total Clients", value: total.toLocaleString() },
          { label: "National Coverage", value: "62.4%" },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm px-5 py-4 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-slate-900 dark:bg-slate-700 text-white">
              <GlobeAltIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{s.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Regional Breakdown</h3>
        <div className="space-y-4">
          {regions.map((region) => (
            <div key={region.name}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-slate-800 dark:text-slate-200 text-sm">{region.name}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{region.clients} clients · {region.invoices} invoices</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{region.revenue}</span>
                  <span className="text-xs font-bold text-orange-600 w-10 text-right">{region.coverage}%</span>
                </div>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-slate-800 dark:from-slate-600 to-orange-600 transition-all duration-700"
                  style={{ width: `${region.coverage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
