import React, {useState} from 'react';
import {Navigation, Trash2} from 'lucide-react';
import {FloodMap} from '../components/FloodMap';
import {ResilientImage, RiskIndicator, StatusText} from '../components/RiskIndicator';
import {TranslationDictionary} from '../i18n/translations';
import {
  BasemapStyle,
  EvacuationRouteResult,
  FeatureCategory,
  FloodReport,
  LayerVisibility,
  MappedFeature,
  NavSection,
  RiskLevel,
  SafeShelter,
} from '../types';
import {calculateSafeEvacuationRoute} from '../utils/gisUtils';

interface LiveFloodMapViewProps {
  features: MappedFeature[];
  reports: FloodReport[];
  shelters: SafeShelter[];
  t: TranslationDictionary;
  basemap: BasemapStyle;
  onBasemapChange: (style: BasemapStyle) => void;
  onDeleteFeature: (id: string) => void;
  onNavigate: (section: NavSection) => void;
}

export const LiveFloodMapView: React.FC<LiveFloodMapViewProps> = ({
  features,
  reports,
  shelters,
  t,
  basemap,
  onBasemapChange,
  onDeleteFeature,
  onNavigate,
}) => {
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({
    houses: true,
    streets: true,
    drains: true,
    waterlogging: true,
    floodZones: true,
    reports: true,
    shelters: true,
    evacuationRoute: true,
  });
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'ALL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<FeatureCategory | 'ALL'>('ALL');
  const [selectedFeature, setSelectedFeature] = useState<MappedFeature | null>(null);
  const [selectedReport, setSelectedReport] = useState<FloodReport | null>(null);
  const [selectedShelter, setSelectedShelter] = useState<SafeShelter | null>(null);
  const [activeRoute, setActiveRoute] = useState<EvacuationRouteResult | null>(null);
  const [flyTarget, setFlyTarget] = useState<{lat: number; lng: number; zoom?: number; nonce: number} | null>(
    null
  );

  const toggleLayer = (key: keyof LayerVisibility) => {
    setLayerVisibility((prev) => ({...prev, [key]: !prev[key]}));
  };

  const handleRouteFromFeature = (feat: MappedFeature) => {
    const pt =
      feat.geometryType === 'Point'
        ? (feat.coordinates as [number, number])
        : (feat.coordinates as [number, number][])[0];
    if (!pt) return;
    const route = calculateSafeEvacuationRoute(pt, feat.name, null, shelters, features, reports);
    setActiveRoute(route);
    setFlyTarget({lat: pt[0], lng: pt[1], zoom: 16, nonce: Date.now()});
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{t.nav['live-map']}</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Toggle GIS vector layers, filter flood hotspots by severity, and inspect community features.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('community-mapping')}
            className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer"
          >
            + Add Map Feature
          </button>
          <button
            type="button"
            onClick={() => onNavigate('report-issue')}
            className="px-3.5 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-xs font-semibold text-white cursor-pointer"
          >
            + {t.common.reportFloodIssue}
          </button>
        </div>
      </div>

      {/* Filter & Layer Bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">{t.common.filterRisk}:</span>
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-md">
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
                  {lvl === 'ALL' ? t.common.all : t.risk[lvl]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="live-cat-filter" className="text-xs font-semibold text-slate-700">
              {t.common.filterCategory}:
            </label>
            <select
              id="live-cat-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as FeatureCategory | 'ALL')}
              className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-800"
            >
              <option value="ALL">All GIS Layers</option>
              <option value="house">{t.categories.house}</option>
              <option value="street">{t.categories.street}</option>
              <option value="drain">{t.categories.drain}</option>
              <option value="blocked_drain">{t.categories.blocked_drain}</option>
              <option value="waterlogging">{t.categories.waterlogging}</option>
              <option value="flood_zone">{t.categories.flood_zone}</option>
            </select>
          </div>
        </div>

        {/* Layer Checkboxes */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
          <span className="font-semibold text-slate-700">Visible Layers:</span>
          {(
            [
              ['houses', t.categories.house],
              ['streets', t.categories.street],
              ['drains', 'Drainage & Blocked Grates'],
              ['waterlogging', t.categories.waterlogging],
              ['floodZones', t.categories.flood_zone],
              ['reports', 'Community Reports'],
              ['shelters', 'Safe Shelters'],
            ] as Array<[keyof LayerVisibility, string]>
          ).map(([key, label]) => (
            <label key={key} className="inline-flex items-center gap-1.5 text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={layerVisibility[key]}
                onChange={() => toggleLayer(key)}
                className="rounded border-slate-300 text-slate-900 focus:ring-sky-600"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Main Map + Right Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-8 xl:col-span-9">
          <FloodMap
            features={features}
            reports={reports}
            shelters={shelters}
            t={t}
            layerVisibility={layerVisibility}
            riskFilter={riskFilter}
            categoryFilter={categoryFilter}
            basemap={basemap}
            onBasemapChange={onBasemapChange}
            evacuationRoute={activeRoute}
            flyToTarget={flyTarget}
            onSelectFeature={(f) => {
              setSelectedFeature(f);
              setSelectedReport(null);
              setSelectedShelter(null);
            }}
            onSelectReport={(r) => {
              setSelectedReport(r);
              setSelectedFeature(null);
              setSelectedShelter(null);
            }}
            onSelectShelter={(s) => {
              setSelectedShelter(s);
              setSelectedFeature(null);
              setSelectedReport(null);
              const demoOrigin: [number, number] = [12.9392, 77.6318];
              const route = calculateSafeEvacuationRoute(
                demoOrigin,
                'House #14/A (1st Cross)',
                s,
                shelters,
                features,
                reports
              );
              setActiveRoute(route);
            }}
            onDeleteFeature={(id) => {
              onDeleteFeature(id);
              if (selectedFeature?.id === id) setSelectedFeature(null);
            }}
            heightClass="h-[580px]"
          />
        </div>

        {/* Right Side Inspector Panel */}
        <div className="lg:col-span-4 xl:col-span-3 bg-white rounded-lg border border-slate-200 p-4 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2.5">
            GIS Feature Inspector
          </h2>

          {selectedFeature ? (
            <div className="space-y-3 text-xs">
              <div className="text-[11px] text-amber-800 font-medium">{selectedFeature.dataOrigin}</div>
              <div className="text-base font-bold text-slate-900">{selectedFeature.name}</div>
              <div className="flex flex-wrap items-center gap-2">
                <RiskIndicator
                  level={selectedFeature.riskLevel}
                  label={t.risk[selectedFeature.riskLevel]}
                />
                <span aria-hidden="true">·</span>
                <StatusText
                  status={selectedFeature.verificationStatus}
                  label={t.status[selectedFeature.verificationStatus]}
                />
                <span aria-hidden="true">·</span>
                <span className="font-mono text-slate-500">{selectedFeature.geometryType}</span>
              </div>

              <p className="text-slate-700 leading-relaxed">{selectedFeature.description}</p>

              {selectedFeature.annotations.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <div className="font-semibold text-slate-800">Community Annotations:</div>
                  {selectedFeature.annotations.map((a) => (
                    <div key={a.id} className="p-2 rounded bg-slate-50 text-slate-700">
                      “{a.text}”
                      <div className="text-[10px] text-slate-500 mt-0.5">— {a.author}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleRouteFromFeature(selectedFeature)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Safe Shelter Route</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteFeature(selectedFeature.id);
                    setSelectedFeature(null);
                  }}
                  className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-semibold cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t.common.delete}</span>
                </button>
              </div>
            </div>
          ) : selectedReport ? (
            <div className="space-y-3 text-xs">
              <div className="text-[11px] text-amber-800 font-medium">{selectedReport.dataOrigin}</div>
              <div className="text-base font-bold text-slate-900">
                {t.reportCategories[selectedReport.category]} — {selectedReport.locationName}
              </div>
              <div className="flex items-center gap-2">
                <RiskIndicator level={selectedReport.severity} label={t.risk[selectedReport.severity]} />
                <span aria-hidden="true">·</span>
                <StatusText status={selectedReport.status} label={t.status[selectedReport.status]} />
              </div>
              {selectedReport.photoUrl && (
                <ResilientImage
                  src={selectedReport.photoUrl}
                  alt={selectedReport.locationName}
                  className="w-full h-36 object-cover rounded border border-slate-200"
                />
              )}
              <p className="text-slate-700 leading-relaxed">{selectedReport.description}</p>
              <div className="font-mono text-[11px] text-slate-500">
                LAT {selectedReport.latitude.toFixed(5)} · LNG {selectedReport.longitude.toFixed(5)}
              </div>
              <button
                type="button"
                onClick={() => onNavigate('admin-panel')}
                className="w-full py-2 rounded-md bg-slate-900 text-white font-semibold hover:bg-slate-800 cursor-pointer"
              >
                Open in Admin Verification →
              </button>
            </div>
          ) : selectedShelter ? (
            <div className="space-y-3 text-xs">
              <div className="text-[11px] text-emerald-700 font-bold">SAFE SHELTER (DEMO)</div>
              <div className="text-base font-bold text-slate-900">{selectedShelter.name}</div>
              <p className="text-slate-600">{selectedShelter.accessibilityNotes}</p>
              <div className="font-mono text-slate-700">
                Capacity: {selectedShelter.capacity} · Elevation: {selectedShelter.elevationMeters}m
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-600 space-y-2.5 py-4">
              <p>
                Click any <strong>house pin</strong>, <strong>narrow lane</strong>,{' '}
                <strong>drainage line</strong>, <strong>flood-risk polygon</strong>, or{' '}
                <strong>report marker</strong> on the map to inspect coordinates, community notes, and
                evacuation options.
              </p>
              <div className="p-3 rounded-md bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                Active dataset: <strong className="font-mono">{features.length}</strong> spatial features
                &amp; <strong className="font-mono">{reports.length}</strong> reports stored locally.
              </div>
            </div>
          )}

          {activeRoute && (
            <div className="pt-3 border-t border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-800">Active Evacuation Route</span>
                <button
                  type="button"
                  onClick={() => setActiveRoute(null)}
                  className="text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Clear
                </button>
              </div>
              <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                {t.common.demoRouteNotice}
              </div>
              <div className="font-mono text-slate-800 font-semibold">
                {activeRoute.distanceMeters} m · ~{activeRoute.estimatedWalkMinutes} min walk
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
