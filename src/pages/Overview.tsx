import StatCard from "@/components/ui/StatCard";
import {
  UsersIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const revenueData = [
  { month: "Jan", revenue: 42000, invoices: 320 },
  { month: "Feb", revenue: 55000, invoices: 410 },
  { month: "Mar", revenue: 48000, invoices: 380 },
  { month: "Apr", revenue: 63000, invoices: 490 },
  { month: "May", revenue: 71000, invoices: 560 },
  { month: "Jun", revenue: 68000, invoices: 530 },
];

const recentActivity = [
  { id: "INV-2041", client: "Acme Corp", amount: "₦1,240,000", status: "Paid", time: "2 min ago" },
  { id: "INV-2040", client: "TechFlow Ltd", amount: "₦890,000", status: "Pending", time: "15 min ago" },
  { id: "INV-2039", client: "Delta Energy", amount: "₦3,120,000", status: "Paid", time: "1 hr ago" },
  { id: "INV-2038", client: "Nexus Group", amount: "₦560,000", status: "Overdue", time: "3 hr ago" },
  { id: "INV-2037", client: "Pinnacle Systems", amount: "₦2,040,000", status: "Paid", time: "5 hr ago" },
];

const statusColor: Record<string, string> = {
  Paid: "bg-green-50 text-green-700",
  Pending: "bg-yellow-50 text-yellow-700",
  Overdue: "bg-red-50 text-red-600",
};

export default function Overview() {
  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-xl border border-orange-200 bg-white">
        {/* Left orange bar */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-600" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pl-6 pr-5 py-4">
          <div>
            <p className="text-xs font-semibold text-orange-600 uppercase tracking-widest mb-0.5">Admin Console</p>
            <h2 className="text-lg font-bold text-slate-900">Good morning, Super Admin</h2>
            <p className="text-sm text-slate-500 mt-0.5">Here's a live summary of the Cryptware network.</p>
          </div>
          <div className="flex items-center gap-6 sm:gap-8 shrink-0">
            <div className="text-center">
              <p className="text-xl font-bold text-slate-900">14</p>
              <p className="text-xs text-slate-400 mt-0.5">Alerts</p>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="text-center">
              <p className="text-xl font-bold text-slate-900">3</p>
              <p className="text-xs text-slate-400 mt-0.5">Overdue</p>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="text-center">
              <p className="text-xl font-bold text-orange-600">₦2.1M</p>
              <p className="text-xs text-slate-400 mt-0.5">Today</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Clients"
          value="2,841"
          change="+12.4%"
          positive
          accent="navy"
          icon={<UsersIcon className="w-5 h-5" />}
        />
        <StatCard
          label="Invoices This Month"
          value="1,390"
          change="+8.1%"
          positive
          accent="orange"
          icon={<DocumentTextIcon className="w-5 h-5" />}
        />
        <StatCard
          label="Revenue (MTD)"
          value="₦68.4M"
          change="+5.3%"
          positive
          accent="green"
          icon={<CurrencyDollarIcon className="w-5 h-5" />}
        />
        <StatCard
          label="Collection Rate"
          value="91.2%"
          change="-1.8%"
          positive={false}
          accent="yellow"
          icon={<ArrowTrendingUpIcon className="w-5 h-5" />}
        />
      </div>

      {/* Charts + Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Revenue chart */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-slate-900">Revenue Trend</h3>
              <p className="text-xs text-slate-400 mt-0.5">Monthly revenue & invoice volume</p>
            </div>
            <span className="text-xs font-medium text-orange-600 bg-orange-50 px-3 py-1 rounded-full">2025</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ea580c" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ border: "none", borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 12 }}
                formatter={(value) => [`₦${Number(value).toLocaleString()}`, "Revenue"]}
              />
              <Area type="monotone" dataKey="revenue" stroke="#ea580c" strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 5, fill: "#ea580c" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Recent Invoices</h3>
            <button className="text-xs text-orange-600 font-medium hover:underline active:scale-95 transition-transform">View all</button>
          </div>
          <div className="space-y-3">
            {recentActivity.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                  <DocumentTextIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{item.client}</p>
                  <p className="text-xs text-slate-400">{item.id} · {item.time}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${statusColor[item.status]}`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
