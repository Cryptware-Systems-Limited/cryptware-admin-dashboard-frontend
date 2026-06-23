import { useState, useMemo, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Cell, ResponsiveContainer,
} from "recharts";
import { ChevronDownIcon, ChevronRightIcon, GlobeAltIcon, UsersIcon, MapPinIcon } from "@heroicons/react/24/outline";
import { MOCK_CLIENTS, type Client, type ProjectStatus, type ServiceType } from "@/data/clients";
import { cn } from "@/lib/utils";

// ── Zone Configuration (PRD 4.6) ───────────────────────────────────────────────
const ZONE_CONFIG: Record<string, {
  color: string; bg: string; border: string; text: string;
  states: string[];
}> = {
  "South West":    { color: "#3b82f6", bg: "bg-blue-500",    border: "border-blue-200 dark:border-blue-500/30",    text: "text-blue-700 dark:text-blue-400",    states: ["Lagos", "Ogun", "Oyo", "Osun", "Ondo", "Ekiti"] },
  "South South":   { color: "#22c55e", bg: "bg-emerald-500", border: "border-emerald-200 dark:border-emerald-500/30",text: "text-emerald-700 dark:text-emerald-400", states: ["Rivers", "Delta", "Bayelsa", "Akwa Ibom", "Cross River", "Edo"] },
  "South East":    { color: "#f97316", bg: "bg-orange-500",  border: "border-orange-200 dark:border-orange-500/30",  text: "text-orange-700 dark:text-orange-400",  states: ["Anambra", "Imo", "Enugu", "Abia", "Ebonyi"] },
  "North West":    { color: "#a855f7", bg: "bg-purple-500",  border: "border-purple-200 dark:border-purple-500/30",  text: "text-purple-700 dark:text-purple-400",  states: ["Kano", "Kaduna", "Sokoto", "Zamfara", "Katsina", "Kebbi", "Jigawa"] },
  "North East":    { color: "#ef4444", bg: "bg-red-500",     border: "border-red-200 dark:border-red-500/30",        text: "text-red-700 dark:text-red-400",        states: ["Borno", "Adamawa", "Yobe", "Taraba", "Bauchi", "Gombe"] },
  "North Central": { color: "#eab308", bg: "bg-yellow-500",  border: "border-yellow-200 dark:border-yellow-500/30",  text: "text-yellow-700 dark:text-yellow-500",  states: ["FCT", "Niger", "Benue", "Kogi", "Kwara", "Nasarawa", "Plateau"] },
};

// ── State positions on SVG map (viewBox 0 0 600 520)
// Scale: x = (lon - 2.7) / 12 * 560 + 20, y = (13.9 - lat) / 9.7 * 480 + 20
const STATE_POSITIONS: Record<string, { x: number; y: number; zone: string }> = {
  // South West
  Lagos:        { x: 53,  y: 386, zone: "South West" },
  Ogun:         { x: 68,  y: 358, zone: "South West" },
  Oyo:          { x: 76,  y: 341, zone: "South West" },
  Osun:         { x: 108, y: 322, zone: "South West" },
  Ondo:         { x: 137, y: 356, zone: "South West" },
  Ekiti:        { x: 140, y: 332, zone: "South West" },
  // South South
  Rivers:       { x: 223, y: 455, zone: "South South" },
  Delta:        { x: 183, y: 424, zone: "South South" },
  Bayelsa:      { x: 175, y: 458, zone: "South South" },
  "Akwa Ibom":  { x: 265, y: 460, zone: "South South" },
  "Cross River":{ x: 281, y: 416, zone: "South South" },
  Edo:          { x: 155, y: 396, zone: "South South" },
  // South East
  Anambra:      { x: 221, y: 401, zone: "South East" },
  Imo:          { x: 218, y: 436, zone: "South East" },
  Enugu:        { x: 248, y: 389, zone: "South East" },
  Abia:         { x: 247, y: 436, zone: "South East" },
  Ebonyi:       { x: 272, y: 396, zone: "South East" },
  // North West
  Kano:         { x: 292, y: 114, zone: "North West" },
  Kaduna:       { x: 241, y: 187, zone: "North West" },
  Sokoto:       { x: 139, y: 61,  zone: "North West" },
  Zamfara:      { x: 205, y: 106, zone: "North West" },
  Katsina:      { x: 249, y: 65,  zone: "North West" },
  Kebbi:        { x: 90,  y: 92,  zone: "North West" },
  Jigawa:       { x: 330, y: 121, zone: "North West" },
  // North East
  Borno:        { x: 508, y: 121, zone: "North East" },
  Adamawa:      { x: 472, y: 246, zone: "North East" },
  Yobe:         { x: 442, y: 114, zone: "North East" },
  Taraba:       { x: 429, y: 312, zone: "North East" },
  Bauchi:       { x: 353, y: 198, zone: "North East" },
  Gombe:        { x: 415, y: 198, zone: "North East" },
  // North Central
  FCT:          { x: 244, y: 259, zone: "North Central" },
  Niger:        { x: 197, y: 233, zone: "North Central" },
  Benue:        { x: 291, y: 327, zone: "North Central" },
  Kogi:         { x: 207, y: 322, zone: "North Central" },
  Kwara:        { x: 104, y: 287, zone: "North Central" },
  Nasarawa:     { x: 291, y: 287, zone: "North Central" },
  Plateau:      { x: 309, y: 217, zone: "North Central" },
};

// ── Main Component ─────────────────────────────────────────────────────────────
export default function GeographicCoverage() {
  const mapRef = useRef<HTMLDivElement>(null);

  const [zoneFilter, setZoneFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "All">("All");
  const [serviceFilter, setServiceFilter] = useState<ServiceType | "All">("All");
  const [expandedZone, setExpandedZone] = useState<string | null>(null);
  const [hoveredState, setHoveredState] = useState<string | null>(null);

  // ── Derived data ──────────────────────────────────────────────────────────────
  const filteredClients = useMemo<Client[]>(() => {
    let list = MOCK_CLIENTS;
    if (zoneFilter)              list = list.filter(c => c.zone === zoneFilter);
    if (statusFilter !== "All")  list = list.filter(c => c.projectStatus === statusFilter);
    if (serviceFilter !== "All") list = list.filter(c => c.serviceTypes.includes(serviceFilter));
    return list;
  }, [zoneFilter, statusFilter, serviceFilter]);

  const clientsByState = useMemo(() => {
    const map: Record<string, Client[]> = {};
    for (const c of filteredClients) {
      (map[c.state] ??= []).push(c);
    }
    return map;
  }, [filteredClients]);

  const zoneSummary = useMemo(() => {
    return Object.entries(ZONE_CONFIG).map(([zone, cfg]) => {
      const statesWithClients = cfg.states.filter(s => clientsByState[s]?.length);
      const total = statesWithClients.reduce((n, s) => n + clientsByState[s].length, 0);
      return {
        zone, color: cfg.color, text: cfg.text, border: cfg.border,
        statesWithClients: statesWithClients.length,
        totalStates: cfg.states.length,
        total,
        pct: filteredClients.length > 0 ? Math.round((total / filteredClients.length) * 100) : 0,
      };
    });
  }, [clientsByState, filteredClients]);

  const barChartData = useMemo(() => {
    return Object.entries(clientsByState)
      .map(([state, clients]) => ({
        state,
        zone: STATE_POSITIONS[state]?.zone ?? "",
        color: ZONE_CONFIG[STATE_POSITIONS[state]?.zone ?? ""]?.color ?? "#94a3b8",
        count: clients.length,
      }))
      .sort((a, b) => b.count - a.count);
  }, [clientsByState]);

  const totalStatesWithClients = Object.keys(clientsByState).length;

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Geographic Coverage</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Client distribution across Nigerian states and geopolitical zones
          </p>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-3 gap-3">
        {([
          {
            label: "Total Clients",
            value: filteredClients.length,
            icon: <UsersIcon className="w-5 h-5" />,
            iconClass: "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600",
          },
          {
            label: "States Covered",
            value: totalStatesWithClients,
            icon: <MapPinIcon className="w-5 h-5" />,
            iconClass: "bg-orange-50 dark:bg-orange-500/10 text-orange-600 border-orange-100 dark:border-orange-500/20",
          },
          {
            label: "Zones with Clients",
            value: zoneSummary.filter(z => z.total > 0).length,
            icon: <GlobeAltIcon className="w-5 h-5" />,
            iconClass: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 border-blue-100 dark:border-blue-500/20",
          },
        ] as const).map(s => (
          <div key={s.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 hover:shadow-md dark:hover:shadow-slate-900/50 transition-shadow duration-200">
            <div className={cn("p-2.5 rounded-xl border w-fit mb-4", s.iconClass)}>{s.icon}</div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{s.value}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Zone pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setZoneFilter(null)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
              !zoneFilter
                ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent"
                : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300"
            )}
          >
            All Zones
          </button>
          {Object.entries(ZONE_CONFIG).map(([zone, cfg]) => (
            <button
              key={zone}
              onClick={() => setZoneFilter(z => z === zone ? null : zone)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                zoneFilter === zone
                  ? "text-white border-transparent shadow-sm"
                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300"
              )}
              style={zoneFilter === zone ? { backgroundColor: cfg.color, borderColor: cfg.color } : {}}
            >
              {zone}
            </button>
          ))}
        </div>

        <div className="flex gap-2 ml-auto">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as ProjectStatus | "All")}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-400/30 cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Live">Live</option>
            <option value="In Progress">In Progress</option>
            <option value="Blocked">Blocked</option>
            <option value="Not Started">Not Started</option>
          </select>
          <select
            value={serviceFilter}
            onChange={e => setServiceFilter(e.target.value as ServiceType | "All")}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-400/30 cursor-pointer"
          >
            <option value="All">All Services</option>
            <option value="Dashboard">Dashboard</option>
            <option value="ERP Support">ERP Support</option>
            <option value="ERP End-to-End">ERP End-to-End</option>
          </select>
        </div>
      </div>

      {/* ── Map + Zone Summary Panel ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Map Area */}
        <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
            <div className="flex items-center gap-2">
              <div className="w-0.5 h-4 rounded-full bg-orange-500" />
              <GlobeAltIcon className="w-4 h-4 text-slate-400" />
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Nigeria Map</h3>
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {filteredClients.length} client{filteredClients.length !== 1 ? "s" : ""} · {totalStatesWithClients} state{totalStatesWithClients !== 1 ? "s" : ""}
            </span>
          </div>

          <div ref={mapRef} className="relative p-4 bg-slate-50/30 dark:bg-slate-800/20">
            <svg
              viewBox="0 0 600 520"
              className="w-full"
              style={{ maxHeight: 480 }}
            >
              {/* Nigeria country outline */}
              <polygon
                points="121,20 579,20 579,356 521,406 299,475 261,480 191,475 130,475 86,441 46,417 20,390 20,91"
                className="fill-slate-100 dark:fill-slate-800 stroke-slate-300 dark:stroke-slate-600"
                strokeWidth="2"
                strokeLinejoin="round"
              />

              {/* All state dots (background) */}
              {Object.entries(STATE_POSITIONS).map(([state, pos]) => {
                const hasClients = !!clientsByState[state];
                const zoneCfg = ZONE_CONFIG[pos.zone];
                const clients = clientsByState[state] ?? [];
                const count = clients.length;
                const radius = hasClients ? Math.min(8 + count * 3, 22) : 5;

                return (
                  <g key={state}
                    onMouseEnter={() => hasClients && setHoveredState(state)}
                    onMouseLeave={() => setHoveredState(null)}
                    className={hasClients ? "cursor-pointer" : ""}
                  >
                    {/* Background glow for client states */}
                    {hasClients && (
                      <circle
                        cx={pos.x} cy={pos.y}
                        r={radius + 6}
                        fill={zoneCfg?.color ?? "#94a3b8"}
                        opacity={0.15}
                      />
                    )}
                    {/* Main pin circle */}
                    <circle
                      cx={pos.x} cy={pos.y}
                      r={radius}
                      fill={hasClients ? (zoneCfg?.color ?? "#94a3b8") : ""}
                      className={hasClients ? "" : "fill-slate-200 dark:fill-slate-700"}
                      opacity={zoneFilter && pos.zone !== zoneFilter ? 0.3 : 1}
                      stroke={hasClients ? "white" : ""}
                      strokeWidth={hasClients ? 1.5 : 0}
                    />
                    {/* Client count label */}
                    {hasClients && (
                      <text
                        x={pos.x} y={pos.y + 4}
                        textAnchor="middle"
                        fill="white"
                        fontSize={count > 9 ? 9 : 11}
                        fontWeight="bold"
                      >
                        {count}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Hovered state tooltip on SVG */}
              {hoveredState && clientsByState[hoveredState] && (() => {
                const pos = STATE_POSITIONS[hoveredState];
                const clients = clientsByState[hoveredState];
                const zoneCfg = ZONE_CONFIG[pos.zone];
                const tooltipX = pos.x > 400 ? pos.x - 210 : pos.x + 20;
                const tooltipY = pos.y > 350 ? pos.y - 120 : pos.y + 20;
                const boxW = 200;
                const lineH = 18;
                const headerH = 30;
                const rowH = clients.length * lineH + 8;
                const boxH = headerH + rowH;

                return (
                  <g>
                    <rect x={tooltipX} y={tooltipY} width={boxW} height={boxH}
                      rx="8" ry="8"
                      className="fill-white dark:fill-slate-900"
                      style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.15))" }}
                    />
                    <rect x={tooltipX} y={tooltipY} width={boxW} height={20}
                      rx="8" ry="8"
                      fill={zoneCfg?.color ?? "#94a3b8"}
                    />
                    <rect x={tooltipX} y={tooltipY + 12} width={boxW} height={8}
                      fill={zoneCfg?.color ?? "#94a3b8"}
                    />
                    <text x={tooltipX + 10} y={tooltipY + 14} fill="white"
                      fontSize="11" fontWeight="bold">
                      {hoveredState} · {pos.zone}
                    </text>
                    {clients.map((c, i) => (
                      <g key={c.id}>
                        <text
                          x={tooltipX + 10}
                          y={tooltipY + headerH + i * lineH + 12}
                          fontSize="10"
                          className="fill-slate-800 dark:fill-slate-100"
                          fill="#1e293b"
                        >
                          {c.name.length > 22 ? c.name.slice(0, 22) + "…" : c.name}
                        </text>
                        <circle
                          cx={tooltipX + 182}
                          cy={tooltipY + headerH + i * lineH + 7}
                          r={4}
                          fill={
                            c.projectStatus === "Live" ? "#22c55e" :
                            c.projectStatus === "In Progress" ? "#f59e0b" :
                            c.projectStatus === "Blocked" ? "#ef4444" : "#94a3b8"
                          }
                        />
                      </g>
                    ))}
                  </g>
                );
              })()}
            </svg>

            {/* Legend overlay (always visible, PRD requirement) */}
            <div className="absolute bottom-6 right-6 bg-white/95 dark:bg-slate-900/95 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-3 space-y-1.5">
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Legend
              </p>
              {Object.entries(ZONE_CONFIG).map(([zone, cfg]) => (
                <div key={zone} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">{zone}</span>
                </div>
              ))}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-1.5 mt-1.5 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
                <span className="text-[11px] text-slate-400 dark:text-slate-500">No clients</span>
              </div>
            </div>
          </div>
        </div>

        {/* Zone Summary Panel */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
            <div className="w-0.5 h-4 rounded-full bg-blue-500" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Zone Summary</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {/* Header row */}
            <div className="grid grid-cols-4 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <span className="col-span-2">Zone</span>
              <span className="text-center">States</span>
              <span className="text-right">Clients</span>
            </div>
            {zoneSummary.map(z => (
              <button
                key={z.zone}
                onClick={() => setZoneFilter(f => f === z.zone ? null : z.zone)}
                className={cn(
                  "w-full grid grid-cols-4 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50",
                  zoneFilter === z.zone && "bg-slate-50 dark:bg-slate-800/50"
                )}
              >
                <div className="col-span-2 flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: z.color }} />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{z.zone}</span>
                </div>
                <div className="text-center">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {z.statesWithClients}/{z.totalStates}
                  </span>
                </div>
                <div className="text-right">
                  {z.total > 0 ? (
                    <span className="text-xs font-bold" style={{ color: z.color }}>{z.total}</span>
                  ) : (
                    <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                  )}
                </div>
              </button>
            ))}
            {/* Totals */}
            <div className="grid grid-cols-4 px-4 py-3 bg-slate-50 dark:bg-slate-800/40">
              <div className="col-span-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Total</span>
              </div>
              <div className="text-center">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {totalStatesWithClients}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {filteredClients.length}
                </span>
              </div>
            </div>
          </div>

          {/* % breakdown bar */}
          <div className="px-4 py-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Distribution
            </p>
            <div className="flex h-2 rounded-full overflow-hidden gap-px">
              {zoneSummary.filter(z => z.total > 0).map(z => (
                <div
                  key={z.zone}
                  className="h-full transition-all"
                  style={{
                    width: `${z.pct}%`,
                    backgroundColor: z.color,
                  }}
                  title={`${z.zone}: ${z.total} clients (${z.pct}%)`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
              {zoneSummary.filter(z => z.total > 0).map(z => (
                <span key={z.zone} className="text-[10px] text-slate-500 dark:text-slate-400">
                  <span className="font-bold" style={{ color: z.color }}>{z.pct}%</span> {z.zone.split(" ")[0]}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Zone Panel Breakdown ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
          <div className="w-0.5 h-4 rounded-full bg-purple-500" />
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Zone Panel Breakdown</h3>
          <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">All states · client count · active/inactive</span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {Object.entries(ZONE_CONFIG).map(([zone, cfg]) => {
            const isExpanded = expandedZone === zone;
            const zoneClients = filteredClients.filter(c => c.zone === zone);
            const zoneStateData = cfg.states.map(state => {
              const clients = clientsByState[state] ?? [];
              const active = clients.filter(c => c.projectStatus === "Live" || c.projectStatus === "In Progress").length;
              const inactive = clients.filter(c => c.projectStatus === "Blocked" || c.projectStatus === "Not Started").length;
              return { state, clients: clients.length, active, inactive };
            });

            return (
              <div key={zone}>
                {/* Zone row (clickable) */}
                <button
                  onClick={() => setExpandedZone(z => z === zone ? null : zone)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
                >
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm flex-1">{zone}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {cfg.states.length} states · {zoneClients.length} client{zoneClients.length !== 1 ? "s" : ""}
                  </span>
                  {isExpanded
                    ? <ChevronDownIcon className="w-4 h-4 text-slate-400 shrink-0" />
                    : <ChevronRightIcon className="w-4 h-4 text-slate-400 shrink-0" />
                  }
                </button>

                {/* Expanded: states table */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                    {/* Column headers */}
                    <div className="grid grid-cols-4 px-8 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                      <span className="col-span-2">State</span>
                      <span className="text-center">Active</span>
                      <span className="text-center">Inactive</span>
                    </div>
                    {zoneStateData.map(({ state, clients: count, active, inactive }) => (
                      <div
                        key={state}
                        className="grid grid-cols-4 px-8 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <div className="col-span-2 flex items-center gap-2">
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: count > 0 ? cfg.color : "#cbd5e1" }}
                          />
                          <span className={cn(
                            "text-xs",
                            count > 0
                              ? "font-semibold text-slate-800 dark:text-slate-200"
                              : "text-slate-400 dark:text-slate-500"
                          )}>
                            {state}
                          </span>
                          {count === 0 && (
                            <span className="text-[10px] text-slate-300 dark:text-slate-600">No clients</span>
                          )}
                        </div>
                        <div className="text-center">
                          {active > 0 ? (
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{active}</span>
                          ) : (
                            <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </div>
                        <div className="text-center">
                          {inactive > 0 ? (
                            <span className="text-xs font-semibold text-red-500 dark:text-red-400">{inactive}</span>
                          ) : (
                            <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Bar Chart: Clients per State ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
          <div className="w-0.5 h-4 rounded-full bg-emerald-500" />
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Clients per State</h3>
          <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">
            {barChartData.length} state{barChartData.length !== 1 ? "s" : ""} with active clients
          </span>
        </div>

        {barChartData.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400 dark:text-slate-500">
            No clients match the current filters.
          </div>
        ) : (
          <div className="p-5">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barChartData} barSize={36} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                <XAxis
                  dataKey="state"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  width={24}
                />
                <RechartsTooltip
                  cursor={{ fill: "rgba(148,163,184,0.08)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg px-3 py-2">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{d.state}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{d.zone}</p>
                        <p className="text-sm font-black mt-1" style={{ color: d.color }}>
                          {d.count} client{d.count !== 1 ? "s" : ""}
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {barChartData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Zone color key under chart */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              {Object.entries(ZONE_CONFIG)
                .filter(([zone]) => barChartData.some(d => d.zone === zone))
                .map(([zone, cfg]) => (
                  <div key={zone} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: cfg.color }} />
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{zone}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
