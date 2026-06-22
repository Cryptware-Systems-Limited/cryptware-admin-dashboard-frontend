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
  Paid: <CheckCircleIcon className="w-4 h-4 text-green-500" />,
  Pending: <ClockIcon className="w-4 h-4 text-yellow-500" />,
  Overdue: <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />,
};

const statusStyle: Record<string, string> = {
  Paid: "bg-green-50 text-green-700",
  Pending: "bg-yellow-50 text-yellow-700",
  Overdue: "bg-red-50 text-red-600",
};

const overdue = invoices.filter(i => i.status === "Overdue").length;
const pending = invoices.filter(i => i.status === "Pending").length;
const paid = invoices.filter(i => i.status === "Paid").length;

export default function InvoiceMonitoring() {
  return (
    <div className="space-y-5">
      {/* Alert banner for overdue */}
      {overdue > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-5 py-4">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 font-medium">
            <span className="font-bold">{overdue} overdue invoices</span> require immediate attention.
          </p>
          <button className="ml-auto text-xs font-semibold text-red-600 hover:text-red-800 active:scale-95 transition-all whitespace-nowrap">
            View Overdue →
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Paid", count: paid, icon: <CheckCircleIcon className="w-5 h-5" />, color: "bg-green-50 text-green-600" },
          { label: "Pending", count: pending, icon: <ClockIcon className="w-5 h-5" />, color: "bg-yellow-50 text-yellow-600" },
          { label: "Overdue", count: overdue, icon: <ExclamationTriangleIcon className="w-5 h-5" />, color: "bg-red-50 text-red-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{s.count}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Invoice table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Invoice Monitor</h3>
          <div className="flex gap-2">
            {["All", "Paid", "Pending", "Overdue"].map((f) => (
              <button
                key={f}
                className={`text-xs px-3 py-1.5 rounded-md font-medium active:scale-95 transition-all ${
                  f === "All" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Invoice</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Client</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Due Date</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Age</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <DocumentTextIcon className="w-4 h-4 text-slate-400" />
                    <span className="font-medium text-slate-800">{inv.id}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-slate-600">{inv.client}</td>
                <td className="px-5 py-4 font-semibold text-slate-800">{inv.amount}</td>
                <td className="px-5 py-4 text-slate-500">{inv.due}</td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${statusStyle[inv.status]}`}>
                    {statusIcon[inv.status]}
                    {inv.status}
                  </span>
                </td>
                <td className="px-5 py-4">
                  {inv.age > 0 ? (
                    <span className="text-red-500 font-semibold text-xs">{inv.age}d overdue</span>
                  ) : (
                    <span className="text-slate-400 text-xs">—</span>
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
