import { MagnifyingGlassIcon, FunnelIcon } from "@heroicons/react/24/outline";

const clients = [
  { id: "CL-001", name: "Acme Corporation", industry: "Manufacturing", invoices: 48, revenue: "₦12.4M", status: "Active" },
  { id: "CL-002", name: "TechFlow Ltd", industry: "Technology", invoices: 31, revenue: "₦8.9M", status: "Active" },
  { id: "CL-003", name: "Delta Energy", industry: "Energy", invoices: 22, revenue: "₦21.3M", status: "Active" },
  { id: "CL-004", name: "Nexus Group", industry: "Finance", invoices: 17, revenue: "₦5.6M", status: "Suspended" },
  { id: "CL-005", name: "Pinnacle Systems", industry: "IT Services", invoices: 39, revenue: "₦15.8M", status: "Active" },
  { id: "CL-006", name: "Global Traders", industry: "Import/Export", invoices: 12, revenue: "₦3.2M", status: "Inactive" },
  { id: "CL-007", name: "Zenith Holdings", industry: "Real Estate", invoices: 28, revenue: "₦9.7M", status: "Active" },
];

const statusStyle: Record<string, string> = {
  Active: "bg-green-50 text-green-700",
  Suspended: "bg-red-50 text-red-600",
  Inactive: "bg-slate-100 text-slate-500",
};

export default function Clients() {
  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search clients..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-400 transition"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 active:scale-95 transition-all">
          <FunnelIcon className="w-4 h-4" />
          Filter
        </button>
        <button className="px-4 py-2.5 rounded-lg bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 active:scale-95 transition-all ml-auto">
          + Add Client
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Client</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Industry</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Invoices</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Revenue</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="px-5 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-slate-50/60 transition-colors group">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {client.name[0]}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{client.name}</p>
                      <p className="text-xs text-slate-400">{client.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-slate-600">{client.industry}</td>
                <td className="px-5 py-4 text-slate-800 font-medium">{client.invoices}</td>
                <td className="px-5 py-4 text-slate-800 font-medium">{client.revenue}</td>
                <td className="px-5 py-4">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusStyle[client.status]}`}>
                    {client.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  <button className="text-xs text-orange-600 font-medium opacity-0 group-hover:opacity-100 active:scale-95 transition-all">
                    View →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
