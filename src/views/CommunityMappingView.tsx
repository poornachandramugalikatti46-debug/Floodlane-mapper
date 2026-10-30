import React, {useState} from 'react';
import {Check, Edit3, MapPin, Minus, Pentagon, RotateCcw, Trash2, X} from 'lucide-react';
import {FloodMap, MapInteractionMode} from '../components/FloodMap';
import {RiskIndicator, StatusText} from '../components/RiskIndicator';
import {QUICK_ANNOTATIONS, TranslationDictionary} from '../i18n/translations';
import {
  BasemapStyle,
  FeatureCategory,
  FloodReport,
  GeometryKind,
  LanguageCode,
  MappedFeature,
  RiskLevel,
  SafeShelter,
} from '../types';
import {measureGeometry, suggestRiskLevelAtPoint} from '../utils/gisUtils';

interface CommunityMappingViewProps {
  features: MappedFeature[];
  reports: FloodReport[];
  shelters: SafeShelter[];
  language: LanguageCode;
  t: TranslationDictionary;
  basemap: BasemapStyle;
  onBasemapChange: (style: BasemapStyle) => void;
  isOffline: boolean;
  onSaveFeature: (feature: MappedFeature) => void;
  onUpdateFeature: (feature: MappedFeature) => void;
  onDeleteFeature: (id: string) => void;
}

const CATEGORY_DEFAULT_GEOM: Record<FeatureCategory, GeometryKind> = {
  house: 'Point',
  street: 'LineString',
  drain: 'LineString',
  blocked_drain: 'Point',
  waterlogging: 'Point',
  flood_zone: 'Polygon',
};

export const CommunityMappingView: React.FC<CommunityMappingViewProps> = ({
  features,
  reports,
  shelters,
  language,
  t,
  basemap,
  onBasemapChange,
  isOffline,
  onSaveFeature,
  onUpdateFeature,
  onDeleteFeature,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<FeatureCategory>('house');
  const [geometryKind, setGeometryKind] = useState<GeometryKind>('Point');
  const [autoSnap, setAutoSnap] = useState<boolean>(true);
  const [draftCoords, setDraftCoords] = useState<[number, number][]>([]);
  const [lastSnapMsg, setLastSnapMsg] = useState<string | null>(null);

  // Form inputs
  const [featureName, setFeatureName] = useState('');
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('HIGH');
  const [description, setDescription] = useState('');
  const [selectedQuickNotes, setSelectedQuickNotes] = useState<string[]>([]);
  const [contributorName, setContributorName] = useState('Community Volunteer');
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  // Editing existing feature state
  const [editingFeature, setEditingFeature] = useState<MappedFeature | null>(null);
  const [flyTarget, setFlyTarget] = useState<{lat: number; lng: number; zoom?: number; nonce: number} | null>(
    null
  );

  const handleCategoryPick = (cat: FeatureCategory) => {
    setSelectedCategory(cat);
    const defaultGeom = CATEGORY_DEFAULT_GEOM[cat];
    setGeometryKind(defaultGeom);
    setDraftCoords([]);
  };

  const interactionMode: MapInteractionMode = `draw-${geometryKind}`;

  const handleAddCoord = (coord: [number, number], snapInfo?: string) => {
    if (snapInfo) {
      setLastSnapMsg(`Vertex auto-snapped to ${snapInfo}`);
    } else {
      setLastSnapMsg(null);
    }

    if (geometryKind === 'Point') {
      setDraftCoords([coord]);
      const suggestion = suggestRiskLevelAtPoint(coord[0], coord[1], features);
      if (suggestion.zoneName) {
        setRiskLevel(suggestion.suggestedRisk);
      }
    } else {
      setDraftCoords((prev) => [...prev, coord]);
    }
  };

  const toggleQuickAnnotation = (note: string) => {
    setSelectedQuickNotes((prev) =>
      prev.includes(note) ? prev.filter((n) => n !== note) : [...prev, note]
    );
  };

  const canSaveDraft =
    (geometryKind === 'Point' && draftCoords.length === 1) ||
    (geometryKind === 'LineString' && draftCoords.length >= 2) ||
    (geometryKind === 'Polygon' && draftCoords.length >= 3);

  const handleSaveNewFeature = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSaveDraft) return;

    const defaultLabel = `${t.categories[selectedCategory]} #${features.length + 1}`;
    const finalName = featureName.trim() || defaultLabel;
    const finalDesc =
      description.trim() ||
      selectedQuickNotes[0] ||
      `Community-mapped ${t.categories[selectedCategory].toLowerCase()} in Ward 148.`;

    const nowIso = new Date().toISOString();
    const newFeature: MappedFeature = {
      id: `feat-${Date.now()}`,
      name: finalName,
      category: selectedCategory,
      geometryType: geometryKind,
      coordinates: geometryKind === 'Point' ? draftCoords[0] : draftCoords,
      riskLevel,
      description: finalDesc,
      annotations: selectedQuickNotes.map((txt, idx) => ({
        id: `ann-${Date.now()}-${idx}`,
        text: txt,
        author: contributorName.trim() || 'Community Volunteer',
        language,
        timestamp: nowIso,
      })),
      verificationStatus: 'Pending',
      dataOrigin: 'COMMUNITY CONTRIBUTED — UNVERIFIED',
      createdBy: contributorName.trim() || 'Community Volunteer',
      createdAt: nowIso,
      syncStatus: isOffline ? 'pending_sync' : 'synced_local',
    };

    onSaveFeature(newFeature);
    setDraftCoords([]);
    setFeatureName('');
    setDescription('');
    setSelectedQuickNotes([]);
    setSaveBanner(
      isOffline
        ? `Saved "${finalName}" offline to IndexedDB (queued for sync).`
        : `Saved "${finalName}" to persistent GIS storage.`
    );
    setTimeout(() => setSaveBanner(null), 5000);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFeature) return;
    onUpdateFeature(editingFeature);
    setEditingFeature(null);
    setSaveBanner('Updated mapped feature successfully.');
    setTimeout(() => setSaveBanner(null), 4000);
  };

  const measurementLabel = measureGeometry(geometryKind, draftCoords);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{t.nav['community-mapping']}</h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Select a settlement feature category, click or sketch directly on the map, attach local monsoon
          observations, and save to local GIS storage.
        </p>
      </div>

      {saveBanner && (
        <div
          role="status"
          className="px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm font-medium flex items-center justify-between"
        >
          <span>{saveBanner}</span>
          <button
            type="button"
            onClick={() => setSaveBanner(null)}
            className="text-emerald-700 hover:text-emerald-950 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Two-Column Sketching Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 7 Columns: Interactive Drawing Map + Touch Drawing Palette */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-3">
          {/* Touch-Friendly Drawing Tool Bar (Buttons >= 44px height) */}
          <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800">
                1. Choose Settlement Category:
              </span>
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-sky-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSnap}
                  onChange={(e) => setAutoSnap(e.target.checked)}
                  className="rounded border-slate-300 text-sky-700"
                />
                <span>{t.common.autoSnap} (Turf.js)</span>
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(
                [
                  ['house', t.categories.house, 'Point'],
                  ['street', t.categories.street, 'Line'],
                  ['drain', t.categories.drain, 'Line'],
                  ['blocked_drain', t.categories.blocked_drain, 'Point'],
                  ['waterlogging', t.categories.waterlogging, 'Point'],
                  ['flood_zone', t.categories.flood_zone, 'Polygon'],
                ] as Array<[FeatureCategory, string, string]>
              ).map(([cat, label, geomHint]) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategoryPick(cat)}
                  className={`min-h-[44px] px-3 py-2 rounded-lg border text-left transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-slate-900 border-slate-900 text-white'
                      : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-semibold leading-tight">{label}</div>
                  <div
                    className={`text-[10px] mt-0.5 ${
                      selectedCategory === cat ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    Default: {geomHint}
                  </div>
                </button>
              ))}
            </div>

            {/* Geometry Mode + Undo / Clear Controls */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-700 mr-1">Tool:</span>
                {(
                  [
                    ['Point', MapPin, 'Point'],
                    ['LineString', Minus, 'Polyline'],
                    ['Polygon', Pentagon, 'Polygon'],
                  ] as const
                ).map(([gType, Icon, label]) => (
                  <button
                    key={gType}
                    type="button"
                    onClick={() => {
                      setGeometryKind(gType);
                      setDraftCoords([]);
                    }}
                    className={`min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors cursor-pointer ${
                      geometryKind === gType
                        ? 'bg-orange-600 border-orange-600 text-white'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                {draftCoords.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setDraftCoords((prev) => prev.slice(0, -1))}
                      className="min-h-[40px] inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{t.common.undoVertex}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDraftCoords([])}
                      className="min-h-[40px] inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 text-xs font-semibold text-red-700 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{t.common.clearDraft}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <FloodMap
            features={features}
            reports={reports}
            shelters={shelters}
            t={t}
            basemap={basemap}
            onBasemapChange={onBasemapChange}
            interactionMode={interactionMode}
            autoSnapEnabled={autoSnap}
            draftCoords={draftCoords}
            onAddDraftCoord={handleAddCoord}
            flyToTarget={flyTarget}
            onDeleteFeature={onDeleteFeature}
            heightClass="h-[500px]"
          />
        </div>

        {/* Right 5/4 Columns: Feature Details & Annotations Form */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-lg border border-slate-200 p-5">
          {editingFeature ? (
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h2 className="text-base font-bold text-slate-900">Edit Mapped Feature</h2>
                <button
                  type="button"
                  onClick={() => setEditingFeature(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  {t.common.cancel}
                </button>
              </div>

              <div>
                <label htmlFor="edit-feat-name" className="block text-xs font-semibold text-slate-800 mb-1">
                  Feature Label / Name
                </label>
                <input
                  id="edit-feat-name"
                  type="text"
                  required
                  value={editingFeature.name}
                  onChange={(e) => setEditingFeature({...editingFeature, name: e.target.value})}
                  className="w-full px-3 py-2.5 rounded-md border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label htmlFor="edit-feat-risk" className="block text-xs font-semibold text-slate-800 mb-1">
                  {t.common.filterRisk}
                </label>
                <select
                  id="edit-feat-risk"
                  value={editingFeature.riskLevel}
                  onChange={(e) =>
                    setEditingFeature({...editingFeature, riskLevel: e.target.value as RiskLevel})
                  }
                  className="w-full px-3 py-2.5 rounded-md border border-slate-300 text-sm bg-white"
                >
                  <option value="LOW">{t.risk.LOW}</option>
                  <option value="MEDIUM">{t.risk.MEDIUM}</option>
                  <option value="HIGH">{t.risk.HIGH}</option>
                  <option value="CRITICAL">{t.risk.CRITICAL}</option>
                </select>
              </div>

              <div>
                <label htmlFor="edit-feat-desc" className="block text-xs font-semibold text-slate-800 mb-1">
                  {t.common.description}
                </label>
                <textarea
                  id="edit-feat-desc"
                  rows={3}
                  value={editingFeature.description}
                  onChange={(e) =>
                    setEditingFeature({...editingFeature, description: e.target.value})
                  }
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 min-h-[44px] px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold cursor-pointer"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingFeature(null)}
                  className="min-h-[44px] px-4 py-2.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 cursor-pointer"
                >
                  {t.common.cancel}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSaveNewFeature} className="space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-base font-bold text-slate-900">2. Feature Metadata &amp; Notes</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Coordinates &amp; geometry captured live from map click
                </p>
              </div>

              {/* Captured Coordinates Status Box */}
              <div className="p-3 rounded-md bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between font-semibold text-slate-800">
                  <span>
                    {t.categories[selectedCategory]} ({geometryKind})
                  </span>
                  <span className="font-mono tabular-nums text-sky-800">
                    {draftCoords.length} {draftCoords.length === 1 ? 'vertex' : 'vertices'}
                  </span>
                </div>
                {draftCoords.length > 0 ? (
                  <div className="font-mono tabular-nums text-[11px] text-slate-600">
                    Start: {draftCoords[0][0].toFixed(5)}, {draftCoords[0][1].toFixed(5)}
                    {measurementLabel ? ` · ${measurementLabel}` : ''}
                  </div>
                ) : (
                  <div className="text-amber-800 font-medium">
                    Click on the map to place {geometryKind === 'Point' ? 'a location marker' : 'shape vertices'}.
                  </div>
                )}
                {lastSnapMsg && <div className="text-[11px] text-sky-700 font-medium">{lastSnapMsg}</div>}
              </div>

              <div>
                <label htmlFor="map-feat-name" className="block text-xs font-semibold text-slate-800 mb-1">
                  Feature Name / Door Number
                </label>
                <input
                  id="map-feat-name"
                  type="text"
                  placeholder={`e.g., House #34 or 5th Cross Narrow Lane`}
                  value={featureName}
                  onChange={(e) => setFeatureName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>

              {/* Flood-Risk Level Selector */}
              <div>
                <span className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Flood-Risk Level
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as RiskLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setRiskLevel(lvl)}
                      className={`min-h-[42px] px-3 py-2 rounded-md border text-left transition-colors cursor-pointer ${
                        riskLevel === lvl
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      {riskLevel === lvl ? (
                        <span className="text-xs font-bold">{t.risk[lvl]}</span>
                      ) : (
                        <RiskIndicator level={lvl} label={t.risk[lvl]} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* One-Tap Community Annotations */}
              <div>
                <span className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Quick Community Annotations (Tap to attach)
                </span>
                <div className="space-y-1.5">
                  {QUICK_ANNOTATIONS[language].map((note) => {
                    const active = selectedQuickNotes.includes(note);
                    return (
                      <button
                        key={note}
                        type="button"
                        onClick={() => toggleQuickAnnotation(note)}
                        className={`w-full text-left px-3 py-2 rounded-md border text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                          active
                            ? 'border-sky-700 bg-sky-50 text-sky-950 font-semibold'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span>{note}</span>
                        {active && <Check className="w-3.5 h-3.5 text-sky-700 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="map-feat-desc" className="block text-xs font-semibold text-slate-800 mb-1">
                  {t.common.description}
                </label>
                <textarea
                  id="map-feat-desc"
                  rows={2}
                  placeholder="Describe plinth height, water depth, drain blockage, or household needs..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>

              <div>
                <label htmlFor="map-contributor" className="block text-xs font-semibold text-slate-800 mb-1">
                  Mapper / Volunteer Name
                </label>
                <input
                  id="map-contributor"
                  type="text"
                  value={contributorName}
                  onChange={(e) => setContributorName(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={!canSaveDraft}
                className={`w-full min-h-[46px] px-4 py-3 rounded-lg text-sm font-bold transition-colors ${
                  canSaveDraft
                    ? 'bg-orange-600 hover:bg-orange-700 text-white cursor-pointer'
                    : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                }`}
              >
                {t.common.save}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Saved Mapped Features Directory with Edit & Delete */}
      <section className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Mapped Settlement Features ({features.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              All community-sketched and demo features stored in IndexedDB — click Edit or Delete anytime
            </p>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[380px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-4">Name</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Coordinates</th>
                <th className="py-2.5 px-4">Risk</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {[...features]
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .map((f) => {
                  const pt =
                    f.geometryType === 'Point'
                      ? (f.coordinates as [number, number])
                      : (f.coordinates as [number, number][])[0];
                  return (
                    <tr key={f.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{f.name}</td>
                      <td className="py-2.5 px-4 text-slate-600">{t.categories[f.category]}</td>
                      <td className="py-2.5 px-4 font-mono tabular-nums text-slate-600">
                        {pt ? `${pt[0].toFixed(5)}, ${pt[1].toFixed(5)}` : '—'}
                      </td>
                      <td className="py-2.5 px-4">
                        <RiskIndicator level={f.riskLevel} label={t.risk[f.riskLevel]} />
                      </td>
                      <td className="py-2.5 px-4">
                        <StatusText
                          status={f.verificationStatus}
                          label={t.status[f.verificationStatus]}
                        />
                      </td>
                      <td className="py-2.5 px-4 text-right space-x-3 whitespace-nowrap">
                        {pt && (
                          <button
                            type="button"
                            onClick={() => {
                              setFlyTarget({lat: pt[0], lng: pt[1], zoom: 18, nonce: Date.now()});
                              window.scrollTo({top: 0, behavior: 'smooth'});
                            }}
                            className="text-sky-700 font-semibold hover:underline cursor-pointer"
                          >
                            Locate
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingFeature(f);
                            window.scrollTo({top: 0, behavior: 'smooth'});
                          }}
                          className="inline-flex items-center gap-1 text-slate-700 font-semibold hover:text-slate-950 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{t.common.edit}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteFeature(f.id)}
                          className="inline-flex items-center gap-1 text-red-700 font-semibold hover:text-red-900 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{t.common.delete}</span>
                        </button>
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
