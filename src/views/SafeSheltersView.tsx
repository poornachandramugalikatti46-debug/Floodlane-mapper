import React, {useMemo, useState} from 'react';
import {AlertTriangle, Navigation} from 'lucide-react';
import {FloodMap} from '../components/FloodMap';
import {ResilientImage} from '../components/RiskIndicator';
import {TranslationDictionary} from '../i18n/translations';
import {
  BasemapStyle,
  EvacuationRouteResult,
  FloodReport,
  MappedFeature,
  SafeShelter,
} from '../types';
import {calculateSafeEvacuationRoute} from '../utils/gisUtils';

interface SafeSheltersViewProps {
  features: MappedFeature[];
  reports: FloodReport[];
  shelters: SafeShelter[];
  t: TranslationDictionary;
  basemap: BasemapStyle;
  onBasemapChange: (style: BasemapStyle) => void;
}

export const SafeSheltersView: React.FC<SafeSheltersViewProps> = ({
  features,
  reports,
  shelters,
  t,
  basemap,
  onBasemapChange,
}) => {
  const houseFeatures = useMemo(
    () => features.filter((f) => f.category === 'house' && f.geometryType === 'Point'),
    [features]
  );

  const [selectedHouseId, setSelectedHouseId] = useState<string>(houseFeatures[0]?.id || 'custom');
  const [customOrigin, setCustomOrigin] = useState<[number, number]>([12.9392, 77.6318]);
  const [selectedShelterId, setSelectedShelterId] = useState<string>('nearest');
  const [flyTarget, setFlyTarget] = useState<{lat: number; lng: number; zoom?: number; nonce: number} | null>(
    null
  );

  const activeOrigin: {coords: [number, number]; label: string} = useMemo(() => {
    if (selectedHouseId !== 'custom') {
      const found = houseFeatures.find((h) => h.id === selectedHouseId);
      if (found) {
        return {coords: found.coordinates as [number, number], label: found.name};
      }
    }
    return {
      coords: customOrigin,
      label: `Custom Map Pin (${customOrigin[0].toFixed(4)}, ${customOrigin[1].toFixed(4)})`,
    };
  }, [selectedHouseId, houseFeatures, customOrigin]);

  const activeRoute: EvacuationRouteResult | null = useMemo(() => {
    if (shelters.length === 0) return null;
    const targetShelter =
      selectedShelterId === 'nearest'
        ? null
        : shelters.find((s) => s.id === selectedShelterId) || null;
    return calculateSafeEvacuationRoute(
      activeOrigin.coords,
      activeOrigin.label,
      targetShelter,
      shelters,
      features,
      reports
    );
  }, [activeOrigin, selectedShelterId, shelters, features, reports]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{t.nav['safe-shelters']}</h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Elevated municipal schools and community halls with safe pedestrian evacuation paths avoiding
          flooded lanes.
        </p>
      </div>

      {/* Explicit DEMO / UNVERIFIED Evacuation Route Safety Banner */}
      <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-300 text-xs text-amber-950 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <strong>DEMO / UNVERIFIED EVACUATION GUIDANCE:</strong> {t.common.demoRouteNotice}
        </div>
      </div>

      {/* Route Planner Controls + Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 5 Columns: Route Planner & Step-by-Step Instructions */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
            <h2 className="text-base font-bold text-slate-900">Safe Evacuation Route Planner</h2>

            <div>
              <label htmlFor="evac-origin" className="block text-xs font-semibold text-slate-800 mb-1.5">
                1. Starting Household / Location
              </label>
              <select
                id="evac-origin"
                value={selectedHouseId}
                onChange={(e) => setSelectedHouseId(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-md border border-slate-300 bg-white text-sm"
              >
                {houseFeatures.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.riskLevel})
                  </option>
                ))}
                <option value="custom">Click Any Custom Point on Map...</option>
              </select>
            </div>

            <div>
              <label htmlFor="evac-dest" className="block text-xs font-semibold text-slate-800 mb-1.5">
                2. Destination Safe Shelter
              </label>
              <select
                id="evac-dest"
                value={selectedShelterId}
                onChange={(e) => setSelectedShelterId(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-md border border-slate-300 bg-white text-sm"
              >
                <option value="nearest">Auto-Select Nearest Safe Shelter</option>
                {shelters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Cap: {s.capacity})
                  </option>
                ))}
              </select>
            </div>

            {activeRoute && (
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-800">
                    Recommended Shelter: {activeRoute.shelter.name}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 p-3 rounded-md bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <div className="text-slate-500">Distance</div>
                    <div className="font-mono tabular-nums font-bold text-slate-900 text-sm">
                      {activeRoute.distanceMeters} m
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Est. Walk</div>
                    <div className="font-mono tabular-nums font-bold text-slate-900 text-sm">
                      ~{activeRoute.estimatedWalkMinutes} min
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Bypassed Risks</div>
                    <div className="font-mono tabular-nums font-bold text-emerald-700 text-sm">
                      {activeRoute.avoidedHazardsCount}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-800">
                    Pedestrian Directions (DEMO / UNVERIFIED):
                  </div>
                  <ol className="space-y-2 text-xs text-slate-700 list-decimal list-inside">
                    {activeRoute.instructions.map((step, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setFlyTarget({
                      lat: activeRoute.shelter.latitude,
                      lng: activeRoute.shelter.longitude,
                      zoom: 16,
                      nonce: Date.now(),
                    })
                  }
                  className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Focus Route &amp; Shelter on Map</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right 7 Columns: Evacuation Route Map */}
        <div className="lg:col-span-7">
          <FloodMap
            features={features}
            reports={reports}
            shelters={shelters}
            t={t}
            basemap={basemap}
            onBasemapChange={onBasemapChange}
            interactionMode={selectedHouseId === 'custom' ? 'pick-point' : 'browse'}
            pickedPoint={selectedHouseId === 'custom' ? customOrigin : null}
            onPickPoint={(pt) => {
              setSelectedHouseId('custom');
              setCustomOrigin(pt);
            }}
            evacuationRoute={activeRoute}
            flyToTarget={flyTarget}
            heightClass="h-[520px]"
          />
        </div>
      </div>

      {/* 3 Demonstration Shelters Directory */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {shelters.map((shelter) => (
          <article
            key={shelter.id}
            className="bg-white rounded-lg border border-slate-200 overflow-hidden flex flex-col"
          >
            <ResilientImage
              src={shelter.photoUrl}
              alt={shelter.name}
              className="w-full h-40 object-cover border-b border-slate-200"
              fallbackLabel="Safe Shelter Building"
            />
            <div className="p-4 flex-1 flex flex-col justify-between space-y-3 text-xs">
              <div className="space-y-2">
                <div className="text-[11px] text-amber-800 font-medium">{shelter.dataOrigin}</div>
                <h3 className="text-sm font-bold text-slate-900">{shelter.name}</h3>
                <div className="text-slate-600">{shelter.locationName}</div>

                <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-y-1.5 text-slate-700">
                  <div>
                    Capacity:{' '}
                    <strong className="font-mono tabular-nums">{shelter.capacity}</strong> persons
                  </div>
                  <div>
                    Elevation:{' '}
                    <strong className="font-mono tabular-nums">{shelter.elevationMeters}m</strong>
                  </div>
                  <div>
                    Drinking Water: <strong>{shelter.drinkingWater ? 'Available' : 'No'}</strong>
                  </div>
                  <div>
                    Toilets: <strong>{shelter.toilets ? 'Available' : 'No'}</strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 text-slate-600 leading-relaxed">
                  <strong className="text-slate-800">
                    Accessibility ({shelter.wheelchairAccessible ? 'Ramp Equipped' : 'Steps at Entry'}):{' '}
                  </strong>
                  {shelter.accessibilityNotes}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedShelterId(shelter.id);
                  setFlyTarget({
                    lat: shelter.latitude,
                    lng: shelter.longitude,
                    zoom: 17,
                    nonce: Date.now(),
                  });
                  window.scrollTo({top: 0, behavior: 'smooth'});
                }}
                className="w-full min-h-[42px] px-3 py-2 rounded-md border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-900 font-semibold cursor-pointer"
              >
                Route to This Shelter
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
};
