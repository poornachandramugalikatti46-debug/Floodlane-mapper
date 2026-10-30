import React, {useState} from 'react';
import {ArrowRight, MapPin, Plus} from 'lucide-react';
import {FloodMap} from '../components/FloodMap';
import {ResilientImage, RiskIndicator, StatusText} from '../components/RiskIndicator';
import {TranslationDictionary} from '../i18n/translations';
import {
  BasemapStyle,
  FloodReport,
  MappedFeature,
  NavSection,
  RiskLevel,
  SafeShelter,
} from '../types';

interface DashboardViewProps {
  features: MappedFeature[];
  reports: FloodReport[];
  shelters: SafeShelter[];
  t: TranslationDictionary;
  basemap: BasemapStyle;
  onBasemapChange: (style: BasemapStyle) => void;
  onNavigate: (section: NavSection) => void;
  onDeleteFeature: (id: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  features,
  reports,
  shelters,
  t,
  basemap,
  onBasemapChange,
  onNavigate,
  onDeleteFeature,
}) => {
  const [flyTarget, setFlyTarget] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
    nonce: number;
  } | null>(null);
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'ALL'>('ALL');

  const housesCount = features.filter((f) => f.category === 'house').length;
  const streetsCount = features.filter((f) => f.category === 'street').length;
  const drainsCount = features.filter(
    (f) => f.category === 'drain' || f.category === 'blocked_drain'
  ).length;
  const hotspotsCount =
    features.filter(
      (f) =>
        (f.category === 'waterlogging' || f.category === 'flood_zone' || f.category === 'blocked_drain') &&
        (f.riskLevel === 'CRITICAL' || f.riskLevel === 'HIGH')
    ).length +
    reports.filter(
      (r) => r.status !== 'Rejected' && (r.severity === 'CRITICAL' || r.severity === 'HIGH')
    ).length;

  const totalReportsCount = reports.length;
  const pendingCount =
    reports.filter((r) => r.status === 'Pending').length +
    features.filter((f) => f.verificationStatus === 'Pending').length;

  // Risk distribution across all mapped features + active reports
  const allRiskItems: RiskLevel[] = [
    ...features.map((f) => f.riskLevel),
    ...reports.filter((r) => r.status !== 'Rejected').map((r) => r.severity),
  ];
  const totalRiskItems = Math.max(1, allRiskItems.length);
  const riskCounts: Record<RiskLevel, number> = {
    CRITICAL: allRiskItems.filter((r) => r === 'CRITICAL').length,
    HIGH: allRiskItems.filter((r) => r === 'HIGH').length,
    MEDIUM: allRiskItems.filter((r) => r === 'MEDIUM').length,
    LOW: allRiskItems.filter((r) => r === 'LOW').length,
  };

  const recentReports = reports.slice(0, 5);
  const recentMappings = [...features]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Top Operational Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {t.nav.dashboard}
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            {t.wardSubtitle} · <span className="text-amber-800 font-medium">{t.demoDisclaimer}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('community-mapping')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-slate-700" />
            <span>{t.common.startMapping}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('report-issue')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <MapPin className="w-4 h-4" />
            <span>{t.common.reportFloodIssue}</span>
          </button>
        </div>
      </div>

      {/* 6 Dynamic KPI Statistics Grid (Single-Elevation, Tabular Numerals) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <button
          type="button"
          onClick={() => onNavigate('community-mapping')}
          className="text-left p-4 rounded-lg bg-white border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
        >
          <div className="text-xs font-medium text-slate-500">{t.kpis.housesMapped}</div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {housesCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Residential footprints</div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('community-mapping')}
          className="text-left p-4 rounded-lg bg-white border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
        >
          <div className="text-xs font-medium text-slate-500">{t.kpis.streetsMapped}</div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {streetsCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Basti cross lanes</div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('live-map')}
          className="text-left p-4 rounded-lg bg-white border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
        >
          <div className="text-xs font-medium text-slate-500">{t.kpis.drainagePoints}</div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-sky-800">
            {drainsCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Channels &amp; grates</div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('risk-analysis')}
          className="text-left p-4 rounded-lg bg-white border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
        >
          <div className="text-xs font-medium text-slate-500">{t.kpis.floodHotspots}</div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-red-700">
            {hotspotsCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">High &amp; critical alerts</div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('community-reports')}
          className="text-left p-4 rounded-lg bg-white border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
        >
          <div className="text-xs font-medium text-slate-500">{t.kpis.communityReports}</div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {totalReportsCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Field submissions</div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('admin-panel')}
          className="text-left p-4 rounded-lg bg-white border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
        >
          <div className="text-xs font-medium text-slate-500">{t.kpis.pendingVerification}</div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-amber-700">
            {pendingCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Awaiting review</div>
        </button>
      </div>

      {/* Main GIS Map + Right Operational Intelligence Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left/Center 8 Columns: Operational Interactive GIS Map */}
        <div className="xl:col-span-8 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-4 py-3 rounded-lg border border-slate-200">
            <span className="text-sm font-semibold text-slate-900">
              Ward 148 Live GIS Overview
            </span>
            <div className="flex flex-wrap items-center gap-1 p-1 rounded-md bg-slate-100">
              {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setRiskFilter(lvl)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    riskFilter === lvl
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lvl === 'ALL' ? t.common.all : lvl}
                </button>
              ))}
            </div>
          </div>

          <FloodMap
            features={features}
            reports={reports}
            shelters={shelters}
            t={t}
            riskFilter={riskFilter}
            basemap={basemap}
            onBasemapChange={onBasemapChange}
            flyToTarget={flyTarget}
            onDeleteFeature={onDeleteFeature}
            heightClass="h-[480px] sm:h-[530px]"
          />
        </div>

        {/* Right 4 Columns: Risk Distribution & Recent Flood Reports */}
        <div className="xl:col-span-4 space-y-5">
          {/* Risk Distribution Breakdown */}
          <section className="bg-white rounded-lg border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Ward Risk Distribution</h2>
              <button
                type="button"
                onClick={() => onNavigate('risk-analysis')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-900 cursor-pointer"
              >
                <span>Analyze</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Across {allRiskItems.length} mapped features &amp; community reports
            </p>

            <div className="mt-4 space-y-3">
              {(
                [
                  {level: 'CRITICAL' as RiskLevel, barClass: 'bg-red-600'},
                  {level: 'HIGH' as RiskLevel, barClass: 'bg-orange-500'},
                  {level: 'MEDIUM' as RiskLevel, barClass: 'bg-amber-500'},
                  {level: 'LOW' as RiskLevel, barClass: 'bg-emerald-600'},
                ] as const
              ).map(({level, barClass}) => {
                const count = riskCounts[level];
                const pct = Math.round((count / totalRiskItems) * 100);
                return (
                  <div key={level}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <RiskIndicator level={level} label={t.risk[level]} />
                      <span className="font-mono tabular-nums text-slate-700 font-medium">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-sm overflow-hidden">
                      <div className={`h-full ${barClass}`} style={{width: `${pct}%`}} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Recent Flood Reports */}
          <section className="bg-white rounded-lg border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900">Recent Flood Reports</h2>
              <button
                type="button"
                onClick={() => onNavigate('community-reports')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-900 cursor-pointer"
              >
                <span>All ({reports.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-200">
              {recentReports.map((rep) => (
                <div key={rep.id} className="py-3 first:pt-0 last:pb-0 flex gap-3 items-start">
                  {rep.photoUrl && (
                    <ResilientImage
                      src={rep.photoUrl}
                      alt={rep.locationName}
                      className="w-14 h-14 rounded object-cover shrink-0 border border-slate-200"
                      fallbackLabel="Photo"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <RiskIndicator level={rep.severity} label={rep.severity} />
                      <span aria-hidden="true">·</span>
                      <StatusText status={rep.status} label={t.status[rep.status]} />
                    </div>
                    <div className="text-xs font-semibold text-slate-900 mt-0.5 truncate">
                      {t.reportCategories[rep.category]} — {rep.locationName}
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">{rep.description}</p>
                    <button
                      type="button"
                      onClick={() =>
                        setFlyTarget({
                          lat: rep.latitude,
                          lng: rep.longitude,
                          zoom: 18,
                          nonce: Date.now(),
                        })
                      }
                      className="mt-1 text-[11px] font-semibold text-sky-700 hover:underline cursor-pointer"
                    >
                      {t.common.viewOnMap} ({rep.latitude.toFixed(4)}, {rep.longitude.toFixed(4)})
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Bottom Table: Community Mapping Activity Log */}
      <section className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Recent Community Mapping Activity</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Latest houses, narrow lanes, drains, and risk zones sketched by volunteers
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('gis-export')}
            className="text-xs font-semibold text-sky-700 hover:text-sky-900 cursor-pointer"
          >
            Export Ward Layers (GeoJSON / CSV) →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-4">Feature Name</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Geometry</th>
                <th className="py-2.5 px-4">Risk Level</th>
                <th className="py-2.5 px-4">Verification</th>
                <th className="py-2.5 px-4">Contributor</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {recentMappings.map((f) => {
                const firstPt =
                  f.geometryType === 'Point'
                    ? (f.coordinates as [number, number])
                    : (f.coordinates as [number, number][])[0];
                return (
                  <tr key={f.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{f.name}</td>
                    <td className="py-2.5 px-4 text-slate-600">{t.categories[f.category]}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">{f.geometryType}</td>
                    <td className="py-2.5 px-4">
                      <RiskIndicator level={f.riskLevel} label={t.risk[f.riskLevel]} />
                    </td>
                    <td className="py-2.5 px-4">
                      <StatusText
                        status={f.verificationStatus}
                        label={t.status[f.verificationStatus]}
                      />
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">{f.createdBy}</td>
                    <td className="py-2.5 px-4 text-right">
                      {firstPt && (
                        <button
                          type="button"
                          onClick={() => {
                            setFlyTarget({
                              lat: firstPt[0],
                              lng: firstPt[1],
                              zoom: 18,
                              nonce: Date.now(),
                            });
                            window.scrollTo({top: 0, behavior: 'smooth'});
                          }}
                          className="text-sky-700 font-semibold hover:underline cursor-pointer"
                        >
                          {t.common.viewOnMap}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
