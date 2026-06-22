import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

const monthlyData = [
  { month: "Jan", sent: 320, paid: 280, overdue: 40 },
  { month: "Feb", sent: 410, paid: 360, overdue: 50 },
  { month: "Mar", sent: 380, paid: 310, overdue: 70 },
  { month: "Apr", sent: 490, paid: 430, overdue: 60 },
  { month: "May", sent: 560, paid: 510, overdue: 50 },
  { month: "Jun", sent: 530, paid: 480, overdue: 50 },
];

const pieData = [
  { name: "Paid", value: 2370, color: "#22c55e" },
  { name: "Pending", value: 480, color: "#eab308" },
  { name: "Overdue", value: 320, color: "#ef4444" },
];

export default function Reports() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Bar chart */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-semibold text-slate-900 mb-1">Invoice Volume</h3>
          <p className="text-xs text-slate-400 mb-5">Sent vs Paid vs Overdue per month</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ border: "none", borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 12 }} />
              <Bar dataKey="sent" name="Sent" fill="#0f172a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="paid" name="Paid" fill="#ea580c" radius={[4, 4, 0, 0]} />
              <Bar dataKey="overdue" name="Overdue" fill="#fca5a5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-semibold text-slate-900 mb-1">Invoice Status</h3>
          <p className="text-xs text-slate-400 mb-4">Breakdown by current status</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ border: "none", borderRadius: 12, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-2">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600">{item.name}</span>
                </div>
                <span className="font-semibold text-slate-800">{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Export section */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">Export Reports</h3>
            <p className="text-xs text-slate-400 mt-0.5">Download invoice and revenue reports</p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 active:scale-95 transition-all">
              Export CSV
            </button>
            <button className="px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 active:scale-95 transition-all">
              Export PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
