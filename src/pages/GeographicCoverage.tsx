import { useState, useMemo, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Cell, ResponsiveContainer,
} from "recharts";
import { ChevronDownIcon, ChevronRightIcon, GlobeAltIcon, UsersIcon, MapPinIcon } from "@heroicons/react/24/outline";
import { MOCK_CLIENTS, type Client, type ProjectStatus, type RAGStatus, type ServiceType } from "@/data/clients";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

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
const STATE_POSITIONS: Record<string, { x: number; y: number; zone: string }> = {
  Lagos:        { x: 53,  y: 386, zone: "South West" },
  Ogun:         { x: 68,  y: 358, zone: "South West" },
  Oyo:          { x: 76,  y: 341, zone: "South West" },
  Osun:         { x: 108, y: 322, zone: "South West" },
  Ondo:         { x: 137, y: 356, zone: "South West" },
  Ekiti:        { x: 140, y: 332, zone: "South West" },
  Rivers:       { x: 223, y: 455, zone: "South South" },
  Delta:        { x: 183, y: 424, zone: "South South" },
  Bayelsa:      { x: 175, y: 458, zone: "South South" },
  "Akwa Ibom":  { x: 265, y: 460, zone: "South South" },
  "Cross River":{ x: 281, y: 416, zone: "South South" },
  Edo:          { x: 155, y: 396, zone: "South South" },
  Anambra:      { x: 221, y: 401, zone: "South East" },
  Imo:          { x: 218, y: 436, zone: "South East" },
  Enugu:        { x: 248, y: 389, zone: "South East" },
  Abia:         { x: 247, y: 436, zone: "South East" },
  Ebonyi:       { x: 272, y: 396, zone: "South East" },
  Kano:         { x: 292, y: 114, zone: "North West" },
  Kaduna:       { x: 241, y: 187, zone: "North West" },
  Sokoto:       { x: 139, y: 61,  zone: "North West" },
  Zamfara:      { x: 205, y: 106, zone: "North West" },
  Katsina:      { x: 249, y: 65,  zone: "North West" },
  Kebbi:        { x: 90,  y: 92,  zone: "North West" },
  Jigawa:       { x: 330, y: 121, zone: "North West" },
  Borno:        { x: 508, y: 121, zone: "North East" },
  Adamawa:      { x: 472, y: 246, zone: "North East" },
  Yobe:         { x: 442, y: 114, zone: "North East" },
  Taraba:       { x: 429, y: 312, zone: "North East" },
  Bauchi:       { x: 353, y: 198, zone: "North East" },
  Gombe:        { x: 415, y: 198, zone: "North East" },
  FCT:          { x: 244, y: 259, zone: "North Central" },
  Niger:        { x: 197, y: 233, zone: "North Central" },
  Benue:        { x: 291, y: 327, zone: "North Central" },
  Kogi:         { x: 207, y: 322, zone: "North Central" },
  Kwara:        { x: 104, y: 287, zone: "North Central" },
  Nasarawa:     { x: 291, y: 287, zone: "North Central" },
  Plateau:      { x: 309, y: 217, zone: "North Central" },
};

// ── Tooltip display helpers ────────────────────────────────────────────────────
const RAG_COLORS: Record<RAGStatus, string> = {
  GREEN:   "#22c55e",
  AMBER:   "#f59e0b",
  RED:     "#ef4444",
  PENDING: "#94a3b8",
};

const STATUS_BADGE: Record<ProjectStatus, string> = {
  "Live":        "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
  "In Progress": "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400",
  "Blocked":     "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400",
  "Not Started": "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400",
};

// ── API types ─────────────────────────────────────────────────────────────────
type ApiOrgStatus = "Active" | "Suspended" | "Inactive Warning";
type ApiServiceCategory = "DASHBOARD" | "ERP" | "BOTH";

interface GeoOrgEntry {
  id: string;
  businessName: string;
  status: ApiOrgStatus;
  serviceCategory: ApiServiceCategory;
}
interface GeoStateData {
  state: string;
  zone: string;
  coordinates: { lat: number; lng: number } | null;
  clientCount: number;
  clients: GeoOrgEntry[];
}
interface GeoCoverageData {
  states: GeoStateData[];
  zones: { zone: string; clientCount: number; statesWithClients: number }[];
  summary: { totalClients: number; statesWithClients: number; zonesWithClients: number };
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function GeographicCoverage() {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const tooltipCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [dataSource, setDataSource] = useState<"crm" | "api">("crm");
  const [apiCoverage, setApiCoverage] = useState<GeoCoverageData | null>(null);
  const [apiLoading, setApiLoading] = useState(false);

  const [zoneFilter, setZoneFilter] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState<string>("All");
  // CRM-mode filters
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "All">("All");
  const [serviceFilter, setServiceFilter] = useState<ServiceType | "All">("All");
  // API-mode filters
  const [apiStatusFilter, setApiStatusFilter] = useState<ApiOrgStatus | "All">("All");
  const [apiServiceFilter, setApiServiceFilter] = useState<ApiServiceCategory | "All">("All");
  const [expandedZone, setExpandedZone] = useState<string | null>(null);
  const [expandedState, setExpandedState] = useState<string | null>(null);
  const [hoveredState, setHoveredState] = useState<string | null>(null);

  // ── Tooltip hover helpers (150 ms grace so user can move pin → tooltip) ───────
  const openTooltip  = (state: string) => {
    if (tooltipCloseTimer.current) clearTimeout(tooltipCloseTimer.current);
    setHoveredState(state);
  };
  const scheduleClose = () => {
    tooltipCloseTimer.current = setTimeout(() => setHoveredState(null), 150);
  };
  const cancelClose = () => {
    if (tooltipCloseTimer.current) clearTimeout(tooltipCloseTimer.current);
  };

  useEffect(() => {
    if (dataSource !== "api") return;
    setApiLoading(true);
    const params = new URLSearchParams();
    if (zoneFilter)                         params.set("zone", zoneFilter);
    if (stateFilter !== "All")              params.set("state", stateFilter);
    if (apiStatusFilter !== "All")          params.set("status", apiStatusFilter);
    if (apiServiceFilter !== "All")         params.set("serviceCategory", apiServiceFilter);
    const qs = params.toString();
    api.get<{ status: string; data: GeoCoverageData }>(`/admin/geographic-coverage${qs ? `?${qs}` : ""}`)
      .then(res => setApiCoverage(res.data))
      .catch(() => {})
      .finally(() => setApiLoading(false));
  }, [dataSource, zoneFilter, stateFilter, apiStatusFilter, apiServiceFilter]);

  // ── CRM derived data ──────────────────────────────────────────────────────────
  const filteredClients = useMemo<Client[]>(() => {
    let list = MOCK_CLIENTS;
    if (zoneFilter)              list = list.filter(c => c.zone === zoneFilter);
    if (stateFilter !== "All")   list = list.filter(c => c.state === stateFilter);
    if (statusFilter !== "All")  list = list.filter(c => c.projectStatus === statusFilter);
    if (serviceFilter !== "All") list = list.filter(c => c.serviceTypes.includes(serviceFilter));
    return list;
  }, [zoneFilter, stateFilter, statusFilter, serviceFilter]);

  const clientsByState = useMemo(() => {
    const map: Record<string, Client[]> = {};
    for (const c of filteredClients) {
      (map[c.state] ??= []).push(c);
    }
    return map;
  }, [filteredClients]);

  // ── Unified state→count ───────────────────────────────────────────────────────
  const stateCountMap = useMemo<Record<string, number>>(() => {
    if (dataSource === "api" && apiCoverage) {
      return Object.fromEntries(apiCoverage.states.map(s => [s.state, s.clientCount]));
    }
    return Object.fromEntries(Object.entries(clientsByState).map(([s, cls]) => [s, cls.length]));
  }, [dataSource, apiCoverage, clientsByState]);

  // Lookup for onboarded org list per state (API mode only)
  const apiOrgsByState = useMemo<Record<string, GeoOrgEntry[]>>(() => {
    if (dataSource !== "api" || !apiCoverage) return {};
    return Object.fromEntries(apiCoverage.states.map(s => [s.state, s.clients]));
  }, [dataSource, apiCoverage]);

  const totalCount = dataSource === "api"
    ? (apiCoverage?.summary.totalClients ?? 0)
    : filteredClients.length;

  const totalStatesWithClients = dataSource === "api"
    ? (apiCoverage?.summary.statesWithClients ?? 0)
    : Object.keys(stateCountMap).length;

  const zoneSummary = useMemo(() => {
    return Object.entries(ZONE_CONFIG).map(([zone, cfg]) => {
      const statesWithClients = cfg.states.filter(s => (stateCountMap[s] ?? 0) > 0);
      const total = statesWithClients.reduce((n, s) => n + (stateCountMap[s] ?? 0), 0);
      return {
        zone, color: cfg.color, text: cfg.text, border: cfg.border,
        statesWithClients: statesWithClients.length,
        totalStates: cfg.states.length,
        total,
        pct: totalCount > 0 ? Math.round((total / totalCount) * 100) : 0,
      };
    });
  }, [stateCountMap, totalCount]);

  const barChartData = useMemo(() => {
    return Object.entries(stateCountMap)
      .map(([state, count]) => ({
        state,
        zone: STATE_POSITIONS[state]?.zone ?? "",
        color: ZONE_CONFIG[STATE_POSITIONS[state]?.zone ?? ""]?.color ?? "#94a3b8",
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [stateCountMap]);

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Geographic Coverage</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Client distribution across Nigerian states and geopolitical zones
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          {(["crm", "api"] as const).map(src => (
            <button
              key={src}
              onClick={() => setDataSource(src)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all",
                dataSource === src
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              {src === "crm" ? "CRM Clients" : "Onboarded API Clients"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-3 gap-3">
        {([
          {
            label: "Total Clients",
            value: apiLoading ? "…" : totalCount,
            icon: <UsersIcon className="w-5 h-5" />,
            iconClass: "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600",
          },
          {
            label: "States Covered",
            value: apiLoading ? "…" : totalStatesWithClients,
            icon: <MapPinIcon className="w-5 h-5" />,
            iconClass: "bg-orange-50 dark:bg-orange-500/10 text-orange-600 border-orange-100 dark:border-orange-500/20",
          },
          {
            label: "Zones with Clients",
            value: apiLoading ? "…" : zoneSummary.filter(z => z.total > 0).length,
            icon: <GlobeAltIcon className="w-5 h-5" />,
            iconClass: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 border-blue-100 dark:border-blue-500/20",
          },
        ] as const).map(s => (
          <div key={s.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 hover:shadow-md transition-shadow duration-200">
            <div className={cn("p-2.5 rounded-xl border w-fit mb-4", s.iconClass)}>{s.icon}</div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{s.value}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="space-y-2">
        {/* Row 1: Zone pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setZoneFilter(null); setStateFilter("All"); }}
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
              onClick={() => { setZoneFilter(z => z === zone ? null : zone); setStateFilter("All"); }}
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

        {/* Row 2: State / Status / ServiceType dropdowns */}
        <div className="flex flex-wrap gap-2">
          {/* State filter — always visible */}
          <select
            value={stateFilter}
            onChange={e => setStateFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-400/30 cursor-pointer"
          >
            <option value="All">All States</option>
            {(zoneFilter ? ZONE_CONFIG[zoneFilter]?.states : Object.values(ZONE_CONFIG).flatMap(c => c.states))
              .sort()
              .map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* CRM-mode filters */}
          {dataSource === "crm" && (
            <>
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
            </>
          )}

          {/* API-mode filters */}
          {dataSource === "api" && (
            <>
              <select
                value={apiStatusFilter}
                onChange={e => setApiStatusFilter(e.target.value as ApiOrgStatus | "All")}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-400/30 cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Suspended">Suspended</option>
                <option value="Inactive Warning">Inactive Warning</option>
              </select>
              <select
                value={apiServiceFilter}
                onChange={e => setApiServiceFilter(e.target.value as ApiServiceCategory | "All")}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-400/30 cursor-pointer"
              >
                <option value="All">All Service Types</option>
                <option value="DASHBOARD">Dashboard only</option>
                <option value="ERP">API only</option>
                <option value="BOTH">Dashboard + API</option>
              </select>
            </>
          )}
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
              {apiLoading ? "Loading…" : `${totalCount} client${totalCount !== 1 ? "s" : ""} · ${totalStatesWithClients} state${totalStatesWithClients !== 1 ? "s" : ""}`}
            </span>
          </div>

          {/* Map container — relative so the HTML tooltip can be absolutely positioned */}
          <div ref={mapRef} className="relative p-4 bg-slate-50/30 dark:bg-slate-800/20">
            <svg
              viewBox="0 0 600 520"
              className="w-full"
              style={{ maxHeight: 480 }}
            >
              {/* Nigeria outline */}
              <polygon
                points="121,20 579,20 579,356 521,406 299,475 261,480 191,475 130,475 86,441 46,417 20,390 20,91"
                className="fill-slate-100 dark:fill-slate-800 stroke-slate-300 dark:stroke-slate-600"
                strokeWidth="2"
                strokeLinejoin="round"
              />

              {/* State pins */}
              {Object.entries(STATE_POSITIONS).map(([state, pos]) => {
                const count = stateCountMap[state] ?? 0;
                const hasClients = count > 0;
                const zoneCfg = ZONE_CONFIG[pos.zone];
                const radius = hasClients ? Math.min(8 + count * 3, 22) : 5;

                return (
                  <g key={state}
                    onMouseEnter={() => hasClients && openTooltip(state)}
                    onMouseLeave={scheduleClose}
                    className={hasClients ? "cursor-pointer" : ""}
                  >
                    {hasClients && (
                      <circle cx={pos.x} cy={pos.y} r={radius + 6}
                        fill={zoneCfg?.color ?? "#94a3b8"} opacity={0.15}
                      />
                    )}
                    <circle
                      cx={pos.x} cy={pos.y} r={radius}
                      fill={hasClients ? (zoneCfg?.color ?? "#94a3b8") : ""}
                      className={hasClients ? "" : "fill-slate-200 dark:fill-slate-700"}
                      opacity={zoneFilter && pos.zone !== zoneFilter ? 0.3 : 1}
                      stroke={hasClients ? "white" : ""}
                      strokeWidth={hasClients ? 1.5 : 0}
                    />
                    {hasClients && (
                      <text x={pos.x} y={pos.y + 4} textAnchor="middle"
                        fill="white" fontSize={count > 9 ? 9 : 11} fontWeight="bold">
                        {count}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* ── HTML tooltip overlay (PRD 4.6 / KAN-179) ── */}
            {hoveredState && (() => {
              const pos = STATE_POSITIONS[hoveredState];
              if (!pos) return null;
              const count = stateCountMap[hoveredState] ?? 0;
              if (count === 0) return null;

              const zoneCfg = ZONE_CONFIG[pos.zone];
              // Convert SVG coords to % of viewBox so tooltip tracks the pin
              const leftPct = (pos.x / 600) * 100;
              const topPct  = (pos.y / 520) * 100;
              const flipX = leftPct > 58;
              const flipY = topPct  > 60;

              return (
                <div
                  className="absolute z-20 pointer-events-auto"
                  style={{
                    left: `${leftPct}%`,
                    top:  `${topPct}%`,
                    transform: `translate(${flipX ? "-108%" : "10px"}, ${flipY ? "-108%" : "10px"})`,
                  }}
                  onMouseEnter={cancelClose}
                  onMouseLeave={scheduleClose}
                >
                  {dataSource === "api" ? (
                    // API mode: per-org cards with View Profile links
                    <div className="min-w-[260px] max-w-[300px] bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="px-3 py-2 text-white text-xs font-bold flex items-center justify-between"
                        style={{ backgroundColor: zoneCfg?.color }}>
                        <span>{hoveredState} · {pos.zone}</span>
                        <span>{count} client{count !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
                        {(apiOrgsByState[hoveredState] ?? []).map(org => (
                          <div key={org.id} className="px-3 py-2.5">
                            <div className="flex items-start gap-2 mb-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                                  {org.businessName}
                                </p>
                              </div>
                              <span className={cn(
                                "text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none whitespace-nowrap shrink-0 mt-0.5",
                                org.status === "Active"
                                  ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                                  : org.status === "Suspended"
                                    ? "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400"
                                    : "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400"
                              )}>
                                {org.status}
                              </span>
                            </div>
                            <Link
                              to={`/clients/${org.id}`}
                              className="block w-full text-center text-[10px] font-bold text-white rounded-lg py-1.5 transition-opacity hover:opacity-85"
                              style={{ backgroundColor: zoneCfg?.color }}
                            >
                              View Profile →
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    // CRM mode: per-client details + "View Profile" links
                    <div className="min-w-[260px] max-w-[300px] bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      {/* Tooltip header */}
                      <div className="px-3 py-2 text-white text-xs font-bold flex items-center justify-between"
                        style={{ backgroundColor: zoneCfg?.color }}>
                        <span>{hoveredState} · {pos.zone}</span>
                        <span>{count} client{count !== 1 ? "s" : ""}</span>
                      </div>
                      {/* Client rows */}
                      <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
                        {(clientsByState[hoveredState] ?? []).map(c => (
                          <div key={c.id} className="px-3 py-2.5">
                            <div className="flex items-start gap-2 mb-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                                  {c.name}
                                </p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  {c.serviceTypes.join(", ")} · {c.erpSystem}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                                {/* RAG status dot */}
                                <span
                                  className="w-2.5 h-2.5 rounded-full border border-white/50"
                                  style={{ backgroundColor: RAG_COLORS[c.ragStatus] }}
                                  title={`RAG: ${c.ragStatus}`}
                                />
                                {/* Project status badge */}
                                <span className={cn(
                                  "text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none whitespace-nowrap",
                                  STATUS_BADGE[c.projectStatus]
                                )}>
                                  {c.projectStatus}
                                </span>
                              </div>
                            </div>
                            <Link
                              to={`/clients/${c.id}`}
                              className="block w-full text-center text-[10px] font-bold text-white rounded-lg py-1.5 transition-opacity hover:opacity-85"
                              style={{ backgroundColor: zoneCfg?.color }}
                            >
                              View Profile →
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Legend overlay */}
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
            <div className="grid grid-cols-4 px-4 py-3 bg-slate-50 dark:bg-slate-800/40">
              <div className="col-span-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Total</span>
              </div>
              <div className="text-center">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{totalStatesWithClients}</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{totalCount}</span>
              </div>
            </div>
          </div>

          {/* % distribution bar */}
          <div className="px-4 py-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Distribution
            </p>
            <div className="flex h-2 rounded-full overflow-hidden gap-px">
              {zoneSummary.filter(z => z.total > 0).map(z => (
                <div
                  key={z.zone}
                  className="h-full transition-all"
                  style={{ width: `${z.pct}%`, backgroundColor: z.color }}
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
          <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">
            {dataSource === "api" ? "All states · client count" : "All states · client count · active/inactive"}
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {Object.entries(ZONE_CONFIG).map(([zone, cfg]) => {
            const isExpanded = expandedZone === zone;
            const zoneTotal = cfg.states.reduce((n, s) => n + (stateCountMap[s] ?? 0), 0);
            const zoneStateData = cfg.states.map(state => {
              const count = stateCountMap[state] ?? 0;
              if (dataSource === "api") return { state, count, active: 0, inactive: 0 };
              const clients = clientsByState[state] ?? [];
              return {
                state, count,
                active:   clients.filter(c => c.projectStatus === "Live" || c.projectStatus === "In Progress").length,
                inactive: clients.filter(c => c.projectStatus === "Blocked" || c.projectStatus === "Not Started").length,
              };
            });

            return (
              <div key={zone}>
                <button
                  onClick={() => setExpandedZone(z => z === zone ? null : zone)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
                >
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm flex-1">{zone}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {cfg.states.length} states · {zoneTotal} client{zoneTotal !== 1 ? "s" : ""}
                  </span>
                  {zoneTotal > 0 && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/clients?${dataSource === "api" ? "tab=onboarded&" : ""}zone=${encodeURIComponent(zone)}`);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.stopPropagation();
                          navigate(`/clients?${dataSource === "api" ? "tab=onboarded&" : ""}zone=${encodeURIComponent(zone)}`);
                        }
                      }}
                      className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:underline whitespace-nowrap"
                    >
                      View clients
                    </span>
                  )}
                  {isExpanded
                    ? <ChevronDownIcon className="w-4 h-4 text-slate-400 shrink-0" />
                    : <ChevronRightIcon className="w-4 h-4 text-slate-400 shrink-0" />
                  }
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                    <div
                      className="grid px-8 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800"
                      style={{ gridTemplateColumns: dataSource === "api" ? "1fr 1fr auto" : "1fr 1fr auto auto" }}
                    >
                      <span className="col-span-2">State</span>
                      {dataSource === "api"
                        ? <span className="text-right">Clients</span>
                        : <><span className="text-center">Active</span><span className="text-center">Inactive</span></>
                      }
                    </div>
                    {zoneStateData.map(({ state, count, active, inactive }) => {
                      const stateClients: Array<Client | GeoOrgEntry> = dataSource === "api"
                        ? (apiOrgsByState[state] ?? [])
                        : (clientsByState[state] ?? []);
                      const isStateExpanded = expandedState === state;
                      return (
                      <div key={state} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <div
                        role={count > 0 ? "button" : undefined}
                        tabIndex={count > 0 ? 0 : undefined}
                        onClick={() => count > 0 && setExpandedState(current => current === state ? null : state)}
                        onKeyDown={(event) => {
                          if (count > 0 && (event.key === "Enter" || event.key === " ")) {
                            setExpandedState(current => current === state ? null : state);
                          }
                        }}
                        className={cn(
                          "grid px-8 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors",
                          count > 0 && "cursor-pointer",
                        )}
                        style={{ gridTemplateColumns: dataSource === "api" ? "1fr 1fr auto" : "1fr 1fr auto auto" }}
                      >
                        <div className="col-span-2 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: count > 0 ? cfg.color : "#cbd5e1" }} />
                          <span className={cn("text-xs", count > 0
                            ? "font-semibold text-slate-800 dark:text-slate-200"
                            : "text-slate-400 dark:text-slate-500")}>
                            {state}
                          </span>
                          {count === 0 && <span className="text-[10px] text-slate-300 dark:text-slate-600">No clients</span>}
                          {count > 0 && (isStateExpanded
                            ? <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                            : <ChevronRightIcon className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                          )}
                        </div>
                        {dataSource === "api" ? (
                          <div className="text-right">
                            {count > 0
                              ? <span className="text-xs font-bold" style={{ color: cfg.color }}>{count}</span>
                              : <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                            }
                          </div>
                        ) : (
                          <>
                            <div className="text-center">
                              {active > 0
                                ? <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{active}</span>
                                : <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                              }
                            </div>
                            <div className="text-center">
                              {inactive > 0
                                ? <span className="text-xs font-semibold text-red-500 dark:text-red-400">{inactive}</span>
                                : <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                              }
                            </div>
                          </>
                        )}
                      </div>
                      {isStateExpanded && (
                        <div className="bg-white/70 dark:bg-slate-950/30 border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                          {stateClients.map((entry) => {
                            const isApiClient = "businessName" in entry;
                            const name = isApiClient ? entry.businessName : entry.name;
                            const detail = isApiClient
                              ? `${entry.status} · ${entry.serviceCategory}`
                              : `${entry.projectStatus} · ${entry.serviceTypes.join(", ")}`;
                            return (
                              <div key={entry.id} className="flex items-center gap-3 pl-12 pr-8 py-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: cfg.color }}>
                                  {name.trim().charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{name}</p>
                                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{detail}</p>
                                </div>
                                <Link
                                  to={`/clients/${entry.id}`}
                                  onClick={(event) => event.stopPropagation()}
                                  className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:underline whitespace-nowrap"
                                >
                                  View details
                                </Link>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      </div>
                    );})}
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
            {apiLoading ? "Loading…" : "No clients match the current filters."}
          </div>
        ) : (
          <div className="p-5">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barChartData} barSize={36} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                <XAxis dataKey="state" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={24} />
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
                  {barChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

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
