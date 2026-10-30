import React, {useMemo, useState} from 'react';
import {Download, FileCode2, FileSpreadsheet} from 'lucide-react';
import {TranslationDictionary} from '../i18n/translations';
import {FloodReport, MappedFeature, SafeShelter} from '../types';
import {
  buildCSVExport,
  buildGeoJSONFeatureCollection,
  ExportFilterOptions,
  triggerFileDownload,
} from '../utils/gisUtils';

interface GISExportViewProps {
  features: MappedFeature[];
  reports: FloodReport[];
  shelters: SafeShelter[];
  t: TranslationDictionary;
}

export const GISExportView: React.FC<GISExportViewProps> = ({
  features,
  reports,
  shelters,
  t,
}) => {
  const [options, setOptions] = useState<ExportFilterOptions>({
    includeHouses: true,
    includeStreets: true,
    includeDrains: true,
    includeFloodZones: true,
    includeReports: true,
    includeShelters: true,
    verificationFilter: 'ALL',
  });
  const [downloadMsg, setDownloadMsg] = useState<string | null>(null);

  const geojsonCollection = useMemo(
    () => buildGeoJSONFeatureCollection(features, reports, shelters, options),
    [features, reports, shelters, options]
  );

  const jsonPreview = useMemo(
    () => JSON.stringify(geojsonCollection, null, 2),
    [geojsonCollection]
  );

  const dateStamp = new Date().toISOString().slice(0, 10);

  const handleDownloadGeoJSON = () => {
    const filename = `floodlane_ward148_${dateStamp}.geojson`;
    triggerFileDownload(jsonPreview, filename, 'application/geo+json;charset=utf-8');
    setDownloadMsg(`Exported ${geojsonCollection.features.length} GIS features to ${filename}`);
  };

  const handleDownloadCSV = () => {
    const csv = buildCSVExport(features, reports, shelters, options);
    const filename = `floodlane_ward148_${dateStamp}.csv`;
    triggerFileDownload(csv, filename, 'text/csv;charset=utf-8');
    setDownloadMsg(`Exported ${geojsonCollection.features.length} tabular GIS rows to ${filename}`);
  };

  const toggleOption = (key: keyof Omit<ExportFilterOptions, 'verificationFilter'>) => {
    setOptions((prev) => ({...prev, [key]: !prev[key]}));
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{t.nav['gis-export']}</h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Export community-mapped basti footprints, narrow lanes, stormwater drains, and flood reports as
          standard EPSG:4326 GeoJSON or CSV for QGIS, ArcGIS, and municipal disaster cells.
        </p>
      </div>

      {downloadMsg && (
        <div
          role="status"
          className="px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-semibold"
        >
          {downloadMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 5 Columns: Layer Selection & Download Controls */}
        <div className="lg:col-span-5 bg-white rounded-lg border border-slate-200 p-5 space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3">
            Select GIS Layers to Export
          </h2>

          <div className="space-y-2.5 text-sm">
            {(
              [
                ['includeHouses', `${t.categories.house} (Point)`, features.filter((f) => f.category === 'house').length],
                ['includeStreets', `${t.categories.street} (LineString)`, features.filter((f) => f.category === 'street').length],
                [
                  'includeDrains',
                  'Drainage Channels & Blocked Grates (LineString / Point)',
                  features.filter((f) => f.category === 'drain' || f.category === 'blocked_drain').length,
                ],
                [
                  'includeFloodZones',
                  'Flood-Risk Polygons & Waterlogging Spots',
                  features.filter((f) => f.category === 'flood_zone' || f.category === 'waterlogging').length,
                ],
                ['includeReports', 'Community Flood Reports (Point)', reports.length],
                ['includeShelters', 'Safe Shelters (Point)', shelters.length],
              ] as Array<[keyof Omit<ExportFilterOptions, 'verificationFilter'>, string, number]>
            ).map(([key, label, count]) => (
              <label
                key={key}
                className="flex items-center justify-between p-2.5 rounded-md border border-slate-200 hover:bg-slate-50 cursor-pointer"
              >
                <span className="inline-flex items-center gap-2.5 text-xs font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={options[key]}
                    onChange={() => toggleOption(key)}
                    className="rounded border-slate-300 text-slate-900"
                  />
                  <span>{label}</span>
                </span>
                <span className="font-mono tabular-nums text-xs font-semibold text-slate-600">
                  {count}
                </span>
              </label>
            ))}
          </div>

          {/* Verification Status Filter */}
          <div>
            <label
              htmlFor="export-verif-filter"
              className="block text-xs font-semibold text-slate-800 mb-1.5"
            >
              Verification Attribute Filter
            </label>
            <select
              id="export-verif-filter"
              value={options.verificationFilter}
              onChange={(e) =>
                setOptions((prev) => ({
                  ...prev,
                  verificationFilter: e.target.value as ExportFilterOptions['verificationFilter'],
                }))
              }
              className="w-full min-h-[42px] px-3 py-2 rounded-md border border-slate-300 bg-white text-xs font-medium"
            >
              <option value="ALL">All Records (Clearly Tagged Verified vs Unverified)</option>
              <option value="Verified">Verified Records Only</option>
              <option value="Unverified">Community / Demo Unverified Only</option>
            </select>
          </div>

          <div className="p-3 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
            <div>
              Selected Export Count:{' '}
              <strong className="font-mono tabular-nums text-slate-900">
                {geojsonCollection.features.length}
              </strong>{' '}
              GeoJSON features
            </div>
            <div>Coordinate Reference System: WGS 84 (EPSG:4326 · [longitude, latitude])</div>
          </div>

          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              disabled={geojsonCollection.features.length === 0}
              onClick={handleDownloadGeoJSON}
              className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-sm font-semibold cursor-pointer"
            >
              <FileCode2 className="w-4 h-4" />
              <span>{t.common.downloadGeoJSON}</span>
            </button>

            <button
              type="button"
              disabled={geojsonCollection.features.length === 0}
              onClick={handleDownloadCSV}
              className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-900 text-sm font-semibold cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>{t.common.downloadCSV}</span>
            </button>
          </div>
        </div>

        {/* Right 7 Columns: Live Valid RFC 7946 GeoJSON FeatureCollection Inspector */}
        <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <span className="text-xs font-bold text-slate-800">
              Live GeoJSON FeatureCollection Preview (RFC 7946 Compliant)
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500">
              <Download className="w-3.5 h-3.5" />
              {(jsonPreview.length / 1024).toFixed(1)} KB
            </span>
          </div>
          <pre className="p-4 text-[11px] font-mono text-slate-800 bg-slate-950 text-slate-100 overflow-auto h-[500px] leading-relaxed">
            {jsonPreview.slice(0, 9000)}
            {jsonPreview.length > 9000 ? '\n\n... [Full GeoJSON included in downloaded file]' : ''}
          </pre>
        </div>
      </div>
    </div>
  );
};
