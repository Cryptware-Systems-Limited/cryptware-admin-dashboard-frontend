import { DocumentTextIcon, ExclamationTriangleIcon, CheckCircleIcon, ClockIcon } from "@heroicons/react/24/outline";

const invoices = [
  { id: "INV-2041", client: "Acme Corp", amount: "₦1,240,000", due: "2025-06-25", status: "Paid", age: 0 },
  { id: "INV-2040", client: "TechFlow Ltd", amount: "₦890,000", due: "2025-06-22", status: "Pending", age: 0 },
  { id: "INV-2039", client: "Delta Energy", amount: "₦3,120,000", due: "2025-06-10", status: "Overdue", age: 12 },
  { id: "INV-2038", client: "Nexus Group", amount: "₦560,000", due: "2025-06-01", status: "Overdue", age: 21 },
  { id: "INV-2037", client: "Pinnacle Systems", amount: "₦2,040,000", due: "2025-06-28", status: "Paid", age: 0 },
  { id: "INV-2036", client: "Global Traders", amount: "₦480,000", due: "2025-05-31", status: "Overdue", age: 22 },
  { id: "INV-2035", client: "Zenith Holdings", amount: "₦1,680,000", due: "2025-06-30", status: "Pending", age: 0 },
];

const statusIcon: Record<string, React.ReactNode> = {
  Paid:    <CheckCircleIcon className="w-4 h-4 text-green-500" />,
  Pending: <ClockIcon className="w-4 h-4 text-yellow-500" />,
  Overdue: <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />,
};

const statusStyle: Record<string, string> = {
  Paid:    "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400",
  Pending: "bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  Overdue: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400",
};

const overdue = invoices.filter(i => i.status === "Overdue").length;
const pending = invoices.filter(i => i.status === "Pending").length;
const paid    = invoices.filter(i => i.status === "Paid").length;

export default function InvoiceMonitoring() {
  return (
    <div className="space-y-5">
      {overdue > 0 && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl px-5 py-4">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400 font-medium">
            <span className="font-bold">{overdue} overdue invoices</span> require immediate attention.
          </p>
          <button className="ml-auto text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 active:scale-95 transition-all whitespace-nowrap">
            View Overdue →
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Paid",    count: paid,    icon: <CheckCircleIcon className="w-5 h-5" />,       color: "bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400" },
          { label: "Pending", count: pending, icon: <ClockIcon className="w-5 h-5" />,              color: "bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
          { label: "Overdue", count: overdue, icon: <ExclamationTriangleIcon className="w-5 h-5" />, color: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400" },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm px-5 py-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{s.count}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div id="invoice-monitor" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Invoice Monitor</h3>
          <div className="flex gap-2">
            {["All", "Paid", "Pending", "Overdue"].map((f) => (
              <button
                key={f}
                className={`text-xs px-3 py-1.5 rounded-md font-medium active:scale-95 transition-all ${
                  f === "All"
                    ? "bg-slate-900 dark:bg-slate-700 text-white"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
              <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Invoice</th>
              <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Client</th>
              <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Amount</th>
              <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Due Date</th>
              <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status</th>
              <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Age</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
            {invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <DocumentTextIcon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <span className="font-medium text-slate-800 dark:text-slate-200 font-mono text-xs">{inv.id}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-400 text-sm">{inv.client}</td>
                <td className="px-5 py-4 font-semibold text-slate-800 dark:text-slate-200 text-sm">{inv.amount}</td>
                <td className="px-5 py-4 text-slate-500 dark:text-slate-400 text-xs font-mono">{inv.due}</td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${statusStyle[inv.status]}`}>
                    {statusIcon[inv.status]}
                    {inv.status}
                  </span>
                </td>
                <td className="px-5 py-4">
                  {inv.age > 0 ? (
                    <span className="text-red-500 dark:text-red-400 font-semibold text-xs">{inv.age}d overdue</span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-600 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
