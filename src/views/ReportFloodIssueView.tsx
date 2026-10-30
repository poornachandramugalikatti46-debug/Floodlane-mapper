import React, {useState} from 'react';
import {Camera, CheckCircle2, LocateFixed, X} from 'lucide-react';
import {FloodMap} from '../components/FloodMap';
import {RiskIndicator} from '../components/RiskIndicator';
import {WARD_CENTER} from '../data/seedData';
import {TranslationDictionary} from '../i18n/translations';
import {compressImageFile} from '../services/storage';
import {
  BasemapStyle,
  FloodReport,
  MappedFeature,
  NavSection,
  ReportCategory,
  RiskLevel,
  SafeShelter,
} from '../types';
import {suggestRiskLevelAtPoint} from '../utils/gisUtils';

interface ReportFloodIssueViewProps {
  features: MappedFeature[];
  reports: FloodReport[];
  shelters: SafeShelter[];
  t: TranslationDictionary;
  basemap: BasemapStyle;
  onBasemapChange: (style: BasemapStyle) => void;
  isOffline: boolean;
  onSubmitReport: (report: FloodReport) => void;
  onNavigate: (section: NavSection) => void;
}

const REPORT_CATEGORIES: ReportCategory[] = [
  'Waterlogging',
  'Blocked Drain',
  'Overflowing Drain',
  'Flooded House',
  'Road Flooding',
];

export const ReportFloodIssueView: React.FC<ReportFloodIssueViewProps> = ({
  features,
  reports,
  shelters,
  t,
  basemap,
  onBasemapChange,
  isOffline,
  onSubmitReport,
  onNavigate,
}) => {
  const [category, setCategory] = useState<ReportCategory>('Waterlogging');
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState<string>(String(WARD_CENTER[0]));
  const [longitude, setLongitude] = useState<string>(String(WARD_CENTER[1]));
  const [severity, setSeverity] = useState<RiskLevel>('HIGH');
  const [suggestedZoneInfo, setSuggestedZoneInfo] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [reportedBy, setReportedBy] = useState('Resident Reporter');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>(undefined);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState<FloodReport | null>(null);

  const parsedLat = Number(latitude);
  const parsedLng = Number(longitude);
  const validCoords =
    !Number.isNaN(parsedLat) &&
    !Number.isNaN(parsedLng) &&
    parsedLat >= -90 &&
    parsedLat <= 90 &&
    parsedLng >= -180 &&
    parsedLng <= 180;

  const handleMapPick = (coord: [number, number]) => {
    setLatitude(coord[0].toFixed(6));
    setLongitude(coord[1].toFixed(6));
    const suggestion = suggestRiskLevelAtPoint(coord[0], coord[1], features);
    setSeverity(suggestion.suggestedRisk);
    setSuggestedZoneInfo(
      suggestion.zoneName
        ? `Auto-suggested ${suggestion.suggestedRisk} based on ${suggestion.zoneName}`
        : null
    );
  };

  const handleUseGPS = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleMapPick([pos.coords.latitude, pos.coords.longitude]);
      },
      () => {
        handleMapPick([12.9391, 77.6321]);
      },
      {timeout: 5000}
    );
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const compressed = await compressImageFile(file);
      setPhotoDataUrl(compressed);
    } catch {
      // Ignore invalid file
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validCoords) return;

    const nowIso = new Date().toISOString();
    const newReport: FloodReport = {
      id: `report-${Date.now()}`,
      category,
      locationName: locationName.trim() || `Near ${parsedLat.toFixed(4)}, ${parsedLng.toFixed(4)}`,
      latitude: parsedLat,
      longitude: parsedLng,
      severity,
      description:
        description.trim() ||
        `${category} reported by resident at ${locationName.trim() || 'selected lane'}.`,
      photoUrl: photoDataUrl,
      status: 'Pending',
      dataOrigin: 'COMMUNITY CONTRIBUTED — UNVERIFIED',
      reportedBy: reportedBy.trim() || 'Community Resident',
      createdAt: nowIso,
      syncStatus: isOffline ? 'pending_sync' : 'synced_local',
    };

    onSubmitReport(newReport);
    setSubmittedSuccess(newReport);
    setLocationName('');
    setDescription('');
    setPhotoDataUrl(undefined);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{t.nav['report-issue']}</h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Submit street-level waterlogging, blocked drains, or house flooding with geo-coordinates and
          photographs.
        </p>
      </div>

      {submittedSuccess && (
        <div
          role="status"
          className="p-4 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-950 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-bold">
                Report Submitted: {submittedSuccess.category} — {submittedSuccess.locationName}
              </div>
              <div className="text-xs text-emerald-800 mt-0.5">
                Marker added to Live Map &amp; Dashboard KPIs updated (
                {isOffline ? 'Saved in Offline Sync Queue' : 'Saved to Local GIS Store'}).
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('community-reports')}
              className="px-3 py-1.5 rounded-md bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
            >
              View in Reports List →
            </button>
            <button
              type="button"
              onClick={() => setSubmittedSuccess(null)}
              className="p-1 text-emerald-800 cursor-pointer"
              aria-label="Dismiss notice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 6 Columns: Flood Reporting Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-6 bg-white rounded-lg border border-slate-200 p-5 space-y-4"
        >
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3">
            Field Flood Incident Form
          </h2>

          {/* Report Category */}
          <div>
            <label htmlFor="rep-category" className="block text-xs font-semibold text-slate-800 mb-1.5">
              Report Category *
            </label>
            <select
              id="rep-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as ReportCategory)}
              className="w-full min-h-[44px] px-3 py-2.5 rounded-md border border-slate-300 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
            >
              {REPORT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t.reportCategories[cat]}
                </option>
              ))}
            </select>
          </div>

          {/* Street / Landmark Name */}
          <div>
            <label htmlFor="rep-location" className="block text-xs font-semibold text-slate-800 mb-1.5">
              Location / Lane Landmark *
            </label>
            <input
              id="rep-location"
              type="text"
              required
              placeholder="e.g., Near Footbridge #2, 1st Cross Ejipura Basti"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2.5 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-600"
            />
          </div>

          {/* Latitude & Longitude + GPS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800">
                Geographical Coordinates (Click map or enter) *
              </span>
              <button
                type="button"
                onClick={handleUseGPS}
                className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:underline cursor-pointer"
              >
                <LocateFixed className="w-3.5 h-3.5" />
                <span>{t.common.locateMe}</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="rep-lat" className="block text-[11px] text-slate-500 mb-1">
                  {t.common.latitude}
                </label>
                <input
                  id="rep-lat"
                  type="number"
                  step="any"
                  required
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full min-h-[42px] px-3 py-2 rounded-md border border-slate-300 font-mono tabular-nums text-sm"
                />
              </div>
              <div>
                <label htmlFor="rep-lng" className="block text-[11px] text-slate-500 mb-1">
                  {t.common.longitude}
                </label>
                <input
                  id="rep-lng"
                  type="number"
                  step="any"
                  required
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full min-h-[42px] px-3 py-2 rounded-md border border-slate-300 font-mono tabular-nums text-sm"
                />
              </div>
            </div>
          </div>

          {/* Flood Severity */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-800">Flood Severity *</span>
              {suggestedZoneInfo && (
                <span className="text-[11px] text-sky-700 font-medium">{suggestedZoneInfo}</span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as RiskLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSeverity(lvl)}
                  className={`min-h-[44px] px-2.5 py-2 rounded-md border text-center transition-colors cursor-pointer ${
                    severity === lvl
                      ? 'bg-slate-900 border-slate-900 text-white font-bold text-xs'
                      : 'bg-white border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {severity === lvl ? (
                    <span>{t.risk[lvl]}</span>
                  ) : (
                    <RiskIndicator level={lvl} label={lvl} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="rep-desc" className="block text-xs font-semibold text-slate-800 mb-1.5">
              {t.common.description} *
            </label>
            <textarea
              id="rep-desc"
              rows={3}
              required
              placeholder="Water depth (ankle/knee/waist), road passability, vulnerable households affected..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-600"
            />
          </div>

          {/* Reporter Name */}
          <div>
            <label htmlFor="rep-author" className="block text-xs font-semibold text-slate-800 mb-1.5">
              Reporter Name / Group
            </label>
            <input
              id="rep-author"
              type="text"
              value={reportedBy}
              onChange={(e) => setReportedBy(e.target.value)}
              className="w-full min-h-[42px] px-3 py-2 rounded-md border border-slate-300 text-sm"
            />
          </div>

          {/* Photograph Upload */}
          <div>
            <span className="block text-xs font-semibold text-slate-800 mb-1.5">
              {t.common.uploadPhoto} (Camera or Gallery)
            </span>
            <label className="flex flex-col items-center justify-center w-full min-h-[96px] px-4 py-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
              <Camera className="w-5 h-5 text-slate-600 mb-1" />
              <span className="text-xs font-semibold text-slate-700">
                {uploadingPhoto ? 'Compressing photograph...' : 'Click to capture or select photo'}
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5">
                Compressed locally for offline IndexedDB storage
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className="sr-only"
              />
            </label>

            {photoDataUrl && (
              <div className="mt-2.5 relative inline-block">
                <img
                  src={photoDataUrl}
                  alt="Uploaded flood preview"
                  className="h-32 w-auto rounded-md border border-slate-300 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPhotoDataUrl(undefined)}
                  className="absolute top-1.5 right-1.5 p-1 rounded bg-slate-900/80 text-white cursor-pointer"
                  aria-label="Remove photo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!validCoords || uploadingPhoto}
            className="w-full min-h-[48px] px-5 py-3 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold transition-colors cursor-pointer"
          >
            {t.common.submitReport}
          </button>
        </form>

        {/* Right 6 Columns: Interactive Location Picker Map */}
        <div className="lg:col-span-6 space-y-3">
          <div className="bg-white rounded-lg border border-slate-200 px-4 py-3 text-xs text-slate-700">
            <strong>Tap / Click Location on Map:</strong> Click exact spot on the lane or drain to set
            coordinates and auto-detect flood risk zone.
          </div>
          <FloodMap
            features={features}
            reports={reports}
            shelters={shelters}
            t={t}
            basemap={basemap}
            onBasemapChange={onBasemapChange}
            interactionMode="pick-point"
            pickedPoint={validCoords ? [parsedLat, parsedLng] : null}
            onPickPoint={handleMapPick}
            heightClass="h-[580px]"
          />
        </div>
      </div>
    </div>
  );
};
