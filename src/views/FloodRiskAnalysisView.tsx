import React, {useMemo, useState} from 'react';
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Droplets,
  Eye,
  FileText,
  Filter,
  Flame,
  Home,
  Info,
  Layers,
  MapPin,
  Maximize2,
  Navigation,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Waves,
  X,
} from 'lucide-react';
import {FloodMap} from '../components/FloodMap';
import {ResilientImage, RiskIndicator, StatusText} from '../components/RiskIndicator';
import {
  DonutRiskChart,
  RiskBarChart,
  VulnerabilityIndicator,
} from '../components/RiskAnalyticsCharts';
import {TranslationDictionary} from '../i18n/translations';
import {
  BasemapStyle,
  FeatureCategory,
  FloodReport,
  LayerVisibility,
  MappedFeature,
  NavSection,
  ReportCategory,
  RiskLevel,
  SafeShelter,
  VerificationStatus,
} from '../types';
import {computeZoneSpatialSummary, RISK_COLORS} from '../utils/gisUtils';

interface FloodRiskAnalysisViewProps {
  features: MappedFeature[];
  reports: FloodReport[];
  shelters: SafeShelter[];
  t: TranslationDictionary;
  basemap: BasemapStyle;
  onBasemapChange: (style: BasemapStyle) => void;
  onNavigate?: (section: NavSection) => void;
}

export const FloodRiskAnalysisView: React.FC<FloodRiskAnalysisViewProps> = ({
  features,
  reports,
  shelters,
  t,
  basemap,
  onBasemapChange,
  onNavigate,
}) => {
  // Filters & State
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'ALL'>('ALL');
  const [reportStatusFilter, setReportStatusFilter] = useState<VerificationStatus | 'ALL'>('ALL');
  const [flyTarget, setFlyTarget] = useState<{lat: number; lng: number; zoom?: number; nonce: number} | null>(
    null
  );
  const [inspectedZone, setInspectedZone] = useState<MappedFeature | null>(null);

  // Map layer visibility toggles specifically for analytics view
  const [mapLayers, setMapLayers] = useState<LayerVisibility>({
    houses: true,
    streets: true,
    drains: true,
    waterlogging: true,
    floodZones: true,
    reports: true,
    shelters: false,
    evacuationRoute: false,
  });

  const toggleMapLayer = (key: keyof LayerVisibility) => {
    setMapLayers((prev) => ({...prev, [key]: !prev[key]}));
  };

  // ================= 1. SUMMARY KPI CALCULATIONS =================
  const totalHouses = useMemo(
    () => features.filter((f) => f.category === 'house').length,
    [features]
  );
  const totalStreets = useMemo(
    () => features.filter((f) => f.category === 'street').length,
    [features]
  );
  const totalDrains = useMemo(
    () => features.filter((f) => f.category === 'drain' || f.category === 'blocked_drain').length,
    [features]
  );
  const floodHotspots = useMemo(
    () =>
      features.filter(
        (f) =>
          (f.category === 'waterlogging' || f.category === 'blocked_drain') &&
          (f.riskLevel === 'CRITICAL' || f.riskLevel === 'HIGH')
      ).length +
      reports.filter(
        (r) => r.status !== 'Rejected' && (r.severity === 'CRITICAL' || r.severity === 'HIGH')
      ).length,
    [features, reports]
  );
  const totalCommunityReports = reports.length;
  const criticalRiskZonesCount = useMemo(
    () => features.filter((f) => f.category === 'flood_zone' && f.riskLevel === 'CRITICAL').length,
    [features]
  );

  // ================= 2. RISK DISTRIBUTION CALCULATIONS =================
  const riskCounts = useMemo(() => {
    const counts: Record<RiskLevel, number> = {CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0};
    features.forEach((f) => {
      counts[f.riskLevel] = (counts[f.riskLevel] || 0) + 1;
    });
    return counts;
  }, [features]);

  const totalFeaturesCount = Math.max(1, features.length);

  const donutData = useMemo(() => {
    const levels: RiskLevel[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    return levels.map((lvl) => ({
      level: lvl,
      label: t.risk[lvl],
      count: riskCounts[lvl],
      percentage: Math.round((riskCounts[lvl] / totalFeaturesCount) * 100),
      color: RISK_COLORS[lvl].hex,
    }));
  }, [riskCounts, totalFeaturesCount, t]);

  // ================= 3. ZONE COMPARISON BY RISK =================
  const allFloodZones = useMemo(
    () => features.filter((f) => f.category === 'flood_zone'),
    [features]
  );

  const filteredZones = useMemo(
    () =>
      allFloodZones.filter(
        (z) => riskFilter === 'ALL' || z.riskLevel === riskFilter
      ),
    [allFloodZones, riskFilter]
  );

  const zoneRiskBarData = useMemo(() => {
    const levels: RiskLevel[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    return levels.map((lvl) => ({
      label: t.risk[lvl],
      count: allFloodZones.filter((z) => z.riskLevel === lvl).length,
      color: RISK_COLORS[lvl].hex,
      secondaryText: `${Math.round(
        (allFloodZones.filter((z) => z.riskLevel === lvl).length / Math.max(1, allFloodZones.length)) * 100
      )}% of zones`,
    }));
  }, [allFloodZones, t]);

  // ================= 4. COMMUNITY REPORTS BY CATEGORY =================
  const reportCategoryBarData = useMemo(() => {
    const cats: ReportCategory[] = [
      'Waterlogging',
      'Blocked Drain',
      'Overflowing Drain',
      'Flooded House',
      'Road Flooding',
    ];
    return cats.map((cat) => {
      const count = reports.filter((r) => r.category === cat).length;
      return {
        label: t.reportCategories[cat] || cat,
        count,
        color:
          cat === 'Overflowing Drain'
            ? '#DC2626'
            : cat === 'Blocked Drain'
            ? '#EA580C'
            : cat === 'Waterlogging'
            ? '#0284C7'
            : cat === 'Flooded House'
            ? '#9333EA'
            : '#475569',
      };
    });
  }, [reports, t]);

  // Filtered Community Reports for the dedicated section
  const filteredReportsList = useMemo(() => {
    return reports.filter((r) => {
      if (reportStatusFilter !== 'ALL' && r.status !== reportStatusFilter) return false;
      if (riskFilter !== 'ALL' && r.severity !== riskFilter) return false;
      return true;
    });
  }, [reports, reportStatusFilter, riskFilter]);

  const verifiedReportsCount = useMemo(
    () => reports.filter((r) => r.status === 'Verified').length,
    [reports]
  );
  const pendingReportsCount = useMemo(
    () => reports.filter((r) => r.status === 'Pending').length,
    [reports]
  );

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto pb-12">
      {/* ================= HEADER & BREADCRUMB ================= */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>Disaster Management GIS</span>
            <span aria-hidden="true">/</span>
            <span className="text-slate-900 font-semibold">Flood Risk Analysis</span>
            <span aria-hidden="true">/</span>
            <span className="text-sky-700">Ward 148 Ejipura Bastis</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 tracking-tight mt-1">
            Flood Risk Analytics &amp; Vulnerability Dashboard
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Ward-level spatial vulnerability assessment, community monsoon telemetry, and street-level risk diagnostics.
          </p>
        </div>

        {/* Action Controls & Interactive Risk Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
            <span className="text-xs font-semibold text-slate-600 px-2 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Filter Risk:
            </span>
            {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setRiskFilter(lvl)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  riskFilter === lvl
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {lvl === 'ALL' ? t.common.all : t.risk[lvl]}
              </button>
            ))}
          </div>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('report-issue')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <span>+ Log Flood Incident</span>
            </button>
          )}
        </div>
      </div>

      {/* Prominent Data Integrity & Prototype Transparency Banner */}
      <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-300 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold tracking-wide">
              PROTOTYPE NOTICE · {t.demoDisclaimer}
            </span>
            <p className="text-amber-800 mt-0.5 leading-relaxed">
              Risk ratings and vulnerability metrics reflect resident-reported historical monsoon flooding,
              basti drainage surveys, and unverified field observations. They are designed for municipal
              ground-truthing and do not represent live hydrodynamic sensor feeds.
            </p>
          </div>
        </div>
        <span className="shrink-0 px-2.5 py-1 rounded-md bg-amber-200/60 font-mono text-[11px] font-semibold text-amber-900">
          Ward 148 Testbed
        </span>
      </div>

      {/* ================= 2. PROFESSIONAL ANALYTICS OVERVIEW CARDS (6 KPIS) ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Mapped Houses */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-shadow hover:shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">{t.kpis.housesMapped}</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <Home className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-slate-900">
              {totalHouses}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Basti plinths &amp; roofs</span>
            </div>
          </div>
        </div>

        {/* Card 2: Mapped Streets */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-shadow hover:shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">{t.kpis.streetsMapped}</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-700">
              <Navigation className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-slate-900">
              {totalStreets}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              <span>Narrow 1.8–3m lanes</span>
            </div>
          </div>
        </div>

        {/* Card 3: Drainage Points */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-shadow hover:shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">{t.kpis.drainagePoints}</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center text-cyan-700">
              <Waves className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-cyan-800">
              {totalDrains}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-600" />
              <span>Nalas, inlets &amp; culverts</span>
            </div>
          </div>
        </div>

        {/* Card 4: Flood Hotspots */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-shadow hover:shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">{t.kpis.floodHotspots}</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-red-600">
              {floodHotspots}
            </div>
            <div className="text-[11px] text-red-700 mt-1 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3 h-3" />
              <span>Critical / High alerts</span>
            </div>
          </div>
        </div>

        {/* Card 5: Community Reports */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-shadow hover:shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">{t.kpis.communityReports}</span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-slate-900">
              {totalCommunityReports}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <span className="font-semibold text-slate-700">{verifiedReportsCount}</span>
              <span>verified by ward</span>
            </div>
          </div>
        </div>

        {/* Card 6: Critical Risk Zones */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-shadow hover:shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Critical Risk Zones</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-700">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-rose-700">
              {criticalRiskZonesCount}
            </div>
            <div className="text-[11px] text-rose-700 mt-1 flex items-center gap-1 font-medium">
              <span>Rajakaluve embankment</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 3. INTERACTIVE VISUALIZATIONS ROW ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Chart A: Flood Risk Distribution (Donut) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-slate-900">Flood Risk Distribution</h2>
            <span className="text-[11px] text-slate-400 font-mono">Ward Breakdown</span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Percentage and volume of mapped settlement features classified by risk tier.
          </p>
          <div className="flex-1 min-h-[220px]">
            <DonutRiskChart data={donutData} total={features.length} />
          </div>
        </div>

        {/* Chart B: Risk Zone Comparison (Bar Chart) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-slate-900">Risk Zone Comparison</h2>
            <span className="text-[11px] text-slate-400 font-mono">{allFloodZones.length} Zones</span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Total residential and transition sectors mapped per severity category.
          </p>
          <div className="flex-1 min-h-[220px]">
            <RiskBarChart items={zoneRiskBarData} maxVal={Math.max(1, allFloodZones.length)} />
          </div>
        </div>

        {/* Chart C: Community Reports by Issue Category (Bar Chart) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-slate-900">Community Reports Analysis</h2>
            <span className="text-[11px] text-slate-400 font-mono">{reports.length} Incidents</span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Reported flood issues categorized by drainage and waterlogging hazard.
          </p>
          <div className="flex-1 min-h-[220px]">
            <RiskBarChart items={reportCategoryBarData} />
          </div>
        </div>
      </div>

      {/* ================= 4. GIS FLOOD RISK MAP (PROMINENT CENTERPIECE) ================= */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Interactive GIS Flood Vulnerability Layer
              </h2>
              <p className="text-xs text-slate-500">
                Spatial polygons &amp; street vectors color-coded by Low, Medium, High, and Critical risk.
              </p>
            </div>
          </div>

          {/* Map Layer Visibility Checkboxes */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <span className="font-semibold text-slate-600">Toggle Layers:</span>
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={mapLayers.floodZones}
                onChange={() => toggleMapLayer('floodZones')}
                className="rounded border-slate-300 text-slate-900 focus:ring-sky-600"
              />
              <span>Risk Zones</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={mapLayers.houses}
                onChange={() => toggleMapLayer('houses')}
                className="rounded border-slate-300 text-slate-900 focus:ring-sky-600"
              />
              <span>Houses ({totalHouses})</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={mapLayers.streets}
                onChange={() => toggleMapLayer('streets')}
                className="rounded border-slate-300 text-slate-900 focus:ring-sky-600"
              />
              <span>Lanes ({totalStreets})</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={mapLayers.drains}
                onChange={() => toggleMapLayer('drains')}
                className="rounded border-slate-300 text-slate-900 focus:ring-sky-600"
              />
              <span>Drains ({totalDrains})</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={mapLayers.reports}
                onChange={() => toggleMapLayer('reports')}
                className="rounded border-slate-300 text-slate-900 focus:ring-sky-600"
              />
              <span>Reports ({reports.length})</span>
            </label>
          </div>
        </div>

        {/* The Map Component */}
        <div className="p-2 sm:p-3 bg-slate-100">
          <FloodMap
            features={features}
            reports={reports}
            shelters={shelters}
            t={t}
            layerVisibility={mapLayers}
            riskFilter={riskFilter}
            basemap={basemap}
            onBasemapChange={onBasemapChange}
            flyToTarget={flyTarget}
            heightClass="h-[520px] sm:h-[600px]"
            showTopControls={true}
            showLegend={true}
          />
        </div>
      </div>

      {/* ================= 5. RISK ZONE DETAILS & VULNERABILITY INDICATORS ================= */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold font-display text-slate-900">
              Detailed Flood Risk Zones &amp; Settlement Sectors ({filteredZones.length})
            </h2>
            <p className="text-xs text-slate-500">
              Individual sector assessments with area footprint, exposed tenements, drainage chokepoints, and resident observations.
            </p>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Showing {filteredZones.length} of {allFloodZones.length} zones
          </span>
        </div>

        {filteredZones.length === 0 ? (
          <div className="p-8 rounded-xl bg-white border border-slate-200 text-center text-sm text-slate-600">
            No flood-risk zones match the filter &ldquo;{riskFilter}&rdquo;.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredZones.map((zone) => {
              const summary = computeZoneSpatialSummary(zone, features, reports);
              const firstCoord = (zone.coordinates as [number, number][])[0];
              const color = RISK_COLORS[zone.riskLevel];

              // Tone styling based on severity
              const borderAccent =
                zone.riskLevel === 'CRITICAL'
                  ? 'border-red-300 bg-red-50/20'
                  : zone.riskLevel === 'HIGH'
                  ? 'border-orange-300 bg-orange-50/20'
                  : zone.riskLevel === 'MEDIUM'
                  ? 'border-amber-300 bg-amber-50/20'
                  : 'border-emerald-300 bg-emerald-50/20';

              return (
                <article
                  key={zone.id}
                  className={`bg-white rounded-xl border ${borderAccent} p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-sm`}
                >
                  <div className="space-y-3.5">
                    {/* Top zone badge & status */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                          style={{backgroundColor: `${color.hex}18`, color: color.hex}}
                        >
                          <span aria-hidden="true">
                            {zone.riskLevel === 'CRITICAL'
                              ? '■'
                              : zone.riskLevel === 'HIGH'
                              ? '◆'
                              : zone.riskLevel === 'MEDIUM'
                              ? '▲'
                              : '●'}
                          </span>
                          <span>{t.risk[zone.riskLevel]}</span>
                        </span>
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <StatusText
                          status={zone.verificationStatus}
                          label={t.status[zone.verificationStatus]}
                        />
                      </div>

                      <span className="font-mono tabular-nums text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded">
                        {summary.areaSqMeters.toLocaleString()} m² Area
                      </span>
                    </div>

                    {/* Zone Name */}
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{zone.name}</h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {zone.description}
                      </p>
                    </div>

                    {/* Primary Risk Factors */}
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                      <span className="font-bold text-slate-800">Primary Risk Drivers: </span>
                      <span className="text-slate-700 leading-relaxed">
                        {zone.riskReason || zone.description}
                      </span>
                    </div>

                    {/* Spatial Exposure Metrics */}
                    <div className="grid grid-cols-3 gap-2.5 pt-1 text-center">
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="text-[11px] text-slate-500">Mapped Houses</div>
                        <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                          {summary.housesInside}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="text-[11px] text-slate-500">Drainage Lines</div>
                        <div className="text-lg font-bold font-mono tabular-nums text-cyan-800 mt-0.5">
                          {summary.drainsCount}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="text-[11px] text-slate-500">Related Reports</div>
                        <div className="text-lg font-bold font-mono tabular-nums text-orange-700 mt-0.5">
                          {summary.relatedReports.length}
                        </div>
                      </div>
                    </div>

                    {/* Community Observations */}
                    {zone.observations && zone.observations.length > 0 && (
                      <div className="space-y-1 text-xs">
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 text-slate-400" />
                          <span>Community Observations:</span>
                        </div>
                        <ul className="space-y-1 text-slate-600 text-[11px] pl-5 list-disc">
                          {zone.observations.map((obs, idx) => (
                            <li key={idx} className="leading-relaxed">
                              {obs}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setInspectedZone(zone)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-900 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Full Breakdown</span>
                    </button>

                    {firstCoord && (
                      <button
                        type="button"
                        onClick={() => {
                          setFlyTarget({
                            lat: firstCoord[0],
                            lng: firstCoord[1],
                            zoom: 17,
                            nonce: Date.now(),
                          });
                          window.scrollTo({top: 500, behavior: 'smooth'});
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5 text-slate-600" />
                        <span>Focus on Map</span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= 6. FLOOD RISK INSIGHTS & ACTIONABLE RECOMMENDATIONS ================= */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-800 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Flood Risk Insights &amp; Priority Recommendations
              </h2>
              <p className="text-xs text-slate-500">
                Synthesized intelligence from community-mapped choke points, resident reports, and terrain vulnerabilities.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
            Ward Disaster Preparedness Action Plan
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {/* Insight 1: Repeated Waterlogging */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
            <div className="flex items-center gap-2 text-rose-700 font-bold text-xs uppercase tracking-wider">
              <AlertOctagon className="w-4 h-4 shrink-0" />
              <span>Chronic Ponding</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">1st Cross Transformer Dip</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Resident reports indicate up to 65cm of standing water near the main feeder pillar within 30 minutes of rain, cutting off primary basti pedestrian passage.
            </p>
            <div className="text-[11px] font-semibold text-rose-800 pt-1">
              Priority: Emergency sandbagging &amp; electrical safety isolation.
            </div>
          </div>

          {/* Insight 2: Blocked Drain Culverts */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
            <div className="flex items-center gap-2 text-amber-700 font-bold text-xs uppercase tracking-wider">
              <Droplets className="w-4 h-4 shrink-0" />
              <span>Drainage Chokepoint</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">Rajakaluve Culvert #2 Grate</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Masonry culvert inlet 80% choked by construction rubble, thermocol, and plastic silt, reducing carrying capacity by an estimated 40% during canal surges.
            </p>
            <div className="text-[11px] font-semibold text-amber-800 pt-1">
              Priority: Pre-monsoon mechanical desilting required.
            </div>
          </div>

          {/* Insight 3: Unverified Field Audits */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
            <div className="flex items-center gap-2 text-sky-700 font-bold text-xs uppercase tracking-wider">
              <Clock className="w-4 h-4 shrink-0" />
              <span>Verification Queue</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">Pending Field Audits</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {pendingReportsCount} community flood incidents and multiple inner lane sketches are currently marked as unverified. Verification ensures inclusion in municipal GIS models.
            </p>
            <div className="text-[11px] font-semibold text-sky-800 pt-1">
              Priority: Dispatch ward volunteer verification team.
            </div>
          </div>

          {/* Insight 4: Vulnerable Households */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
            <div className="flex items-center gap-2 text-purple-700 font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Special Needs Relief</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">Low-Plinth Senior Tenements</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Four ground-floor households near Footbridge #2 house elderly residents and a wheelchair user. Early evacuation warning is critical when canal surge threshold is reached.
            </p>
            <div className="text-[11px] font-semibold text-purple-800 pt-1">
              Priority: Pre-assigned volunteer buddy system to school shelter.
            </div>
          </div>
        </div>
      </section>

      {/* ================= 7. COMMUNITY REPORT ANALYTICS & TIMELINE ================= */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Community Flood Incident Reports ({filteredReportsList.length})
            </h2>
            <p className="text-xs text-slate-500">
              Resident field submissions with photographic evidence, severity rating, and ward review status.
            </p>
          </div>

          {/* Report Status Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg text-xs">
            {(['ALL', 'Pending', 'Reviewed', 'Verified'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setReportStatusFilter(status)}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                  reportStatusFilter === status
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status === 'ALL' ? 'All Reports' : t.status[status]}
              </button>
            ))}
          </div>
        </div>

        {/* Reports Grid */}
        <div className="p-5">
          {filteredReportsList.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              No flood reports found matching status &ldquo;{reportStatusFilter}&rdquo; and risk &ldquo;{riskFilter}&rdquo;.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredReportsList.slice(0, 6).map((rep) => (
                <div
                  key={rep.id}
                  className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
                >
                  <div>
                    {rep.photoUrl ? (
                      <ResilientImage
                        src={rep.photoUrl}
                        alt={rep.locationName}
                        className="w-full h-36 object-cover border-b border-slate-100"
                        fallbackLabel="No Photo Provided"
                      />
                    ) : (
                      <div className="w-full h-24 bg-slate-50 border-b border-slate-100 flex items-center justify-center text-slate-400 text-xs">
                        <span>Incident Logged Without Photo</span>
                      </div>
                    )}

                    <div className="p-3.5 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <RiskIndicator level={rep.severity} label={t.risk[rep.severity]} />
                        <StatusText status={rep.status} label={t.status[rep.status]} />
                      </div>

                      <h4 className="font-bold text-slate-900 text-sm truncate">
                        {t.reportCategories[rep.category]} — {rep.locationName}
                      </h4>

                      <p className="text-slate-600 line-clamp-2 leading-relaxed">
                        {rep.description}
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 bg-slate-50/50">
                    <span>By {rep.reportedBy}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setFlyTarget({
                          lat: rep.latitude,
                          lng: rep.longitude,
                          zoom: 18,
                          nonce: Date.now(),
                        });
                        window.scrollTo({top: 500, behavior: 'smooth'});
                      }}
                      className="font-semibold text-sky-700 hover:underline cursor-pointer"
                    >
                      Locate on Map →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredReportsList.length > 6 && onNavigate && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => onNavigate('community-reports')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
              >
                <span>View All {reports.length} Community Reports</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ================= ZONE DEEP-DIVE MODAL ================= */}
      {inspectedZone && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <span
                  className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider"
                  style={{
                    backgroundColor: `${RISK_COLORS[inspectedZone.riskLevel].hex}18`,
                    color: RISK_COLORS[inspectedZone.riskLevel].hex,
                  }}
                >
                  {inspectedZone.riskLevel} RISK ZONE
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{inspectedZone.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectedZone(null)}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                <span className="font-bold text-slate-900">Summary &amp; Geometry:</span>
                <p className="leading-relaxed">{inspectedZone.description}</p>
              </div>

              {inspectedZone.riskReason && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-950 space-y-1">
                  <span className="font-bold">Root Causes of Inundation:</span>
                  <p className="leading-relaxed">{inspectedZone.riskReason}</p>
                </div>
              )}

              {inspectedZone.observations && inspectedZone.observations.length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-bold text-slate-900">Community Observations Log:</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 pl-2">
                    {inspectedZone.observations.map((obs, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {obs}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-100">
                Data Origin: {inspectedZone.dataOrigin}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const pt = (inspectedZone.coordinates as [number, number][])[0];
                  if (pt) {
                    setFlyTarget({lat: pt[0], lng: pt[1], zoom: 17, nonce: Date.now()});
                    window.scrollTo({top: 500, behavior: 'smooth'});
                  }
                  setInspectedZone(null);
                }}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
              >
                Focus on Map &amp; Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
