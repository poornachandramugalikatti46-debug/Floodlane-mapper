import React, {useEffect, useRef, useState} from 'react';
import L from 'leaflet';
import {Crosshair, Layers, LocateFixed, Map as MapIcon, Satellite} from 'lucide-react';
import {DEFAULT_ZOOM, LOCALITY_PRESETS, WARD_CENTER} from '../data/seedData';
import {TranslationDictionary} from '../i18n/translations';
import {
  BasemapStyle,
  EvacuationRouteResult,
  FeatureCategory,
  FloodReport,
  LayerVisibility,
  MappedFeature,
  RiskLevel,
  SafeShelter,
} from '../types';
import {RISK_COLORS, snapCoordinateToNetwork} from '../utils/gisUtils';

export type MapInteractionMode =
  | 'browse'
  | 'pick-point'
  | 'draw-Point'
  | 'draw-LineString'
  | 'draw-Polygon';

interface FloodMapProps {
  features: MappedFeature[];
  reports: FloodReport[];
  shelters: SafeShelter[];
  t: TranslationDictionary;
  layerVisibility?: LayerVisibility;
  riskFilter?: RiskLevel | 'ALL';
  categoryFilter?: FeatureCategory | 'ALL';
  basemap: BasemapStyle;
  onBasemapChange: (style: BasemapStyle) => void;
  interactionMode?: MapInteractionMode;
  autoSnapEnabled?: boolean;
  draftCoords?: [number, number][];
  onAddDraftCoord?: (coord: [number, number], snapInfo?: string) => void;
  pickedPoint?: [number, number] | null;
  onPickPoint?: (coord: [number, number]) => void;
  evacuationRoute?: EvacuationRouteResult | null;
  flyToTarget?: {lat: number; lng: number; zoom?: number; nonce: number} | null;
  onSelectFeature?: (feature: MappedFeature) => void;
  onSelectReport?: (report: FloodReport) => void;
  onSelectShelter?: (shelter: SafeShelter) => void;
  onDeleteFeature?: (featureId: string) => void;
  heightClass?: string;
  showTopControls?: boolean;
  showLegend?: boolean;
}

const DEFAULT_VISIBILITY: LayerVisibility = {
  houses: true,
  streets: true,
  drains: true,
  waterlogging: true,
  floodZones: true,
  reports: true,
  shelters: true,
  evacuationRoute: true,
};

function createMarkerSvgIcon(
  category: FeatureCategory | 'report' | 'shelter',
  risk: RiskLevel,
  verified: boolean
): L.DivIcon {
  const color = category === 'shelter' ? '#059669' : RISK_COLORS[risk].hex;
  const strokeDash = verified ? '' : 'stroke-dasharray="3,2"';
  let innerGlyph = '';

  if (category === 'house') {
    innerGlyph = `<path d="M14 8l-6 5.2V20h4v-4h4v4h4v-6.8L14 8z" fill="#ffffff"/>`;
  } else if (category === 'blocked_drain' || category === 'drain') {
    innerGlyph = `<rect x="9" y="9" width="10" height="10" rx="1.5" fill="#ffffff"/><path d="M11 11l6 6M17 11l-6 6" stroke="${color}" stroke-width="2"/>`;
  } else if (category === 'waterlogging') {
    innerGlyph = `<path d="M14 7.5c-3 4-4.5 6.2-4.5 8.2a4.5 4.5 0 009 0c0-2-1.5-4.2-4.5-8.2z" fill="#ffffff"/>`;
  } else if (category === 'report') {
    innerGlyph = `<path d="M14 8l6 11H8L14 8z" fill="#ffffff"/><rect x="13.2" y="12" width="1.6" height="3.6" fill="${color}"/><circle cx="14" cy="17.2" r="0.9" fill="${color}"/>`;
  } else if (category === 'shelter') {
    innerGlyph = `<path d="M12.5 8.5h3v4h4v3h-4v4h-3v-4h-4v-3h4v-4z" fill="#ffffff"/>`;
  } else {
    innerGlyph = `<circle cx="14" cy="14" r="4" fill="#ffffff"/>`;
  }

  const size = category === 'shelter' ? 32 : 28;
  const html = `
    <div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;">
      <svg width="${size}" height="${size}" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
        <circle cx="14" cy="14" r="12" fill="${color}" stroke="#ffffff" stroke-width="2.5" ${strokeDash} />
        ${verified ? `<circle cx="14" cy="14" r="13.2" fill="none" stroke="#0f172a" stroke-width="1.2" />` : ''}
        ${innerGlyph}
      </svg>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-gis-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const FloodMap: React.FC<FloodMapProps> = ({
  features,
  reports,
  shelters,
  t,
  layerVisibility = DEFAULT_VISIBILITY,
  riskFilter = 'ALL',
  categoryFilter = 'ALL',
  basemap,
  onBasemapChange,
  interactionMode = 'browse',
  autoSnapEnabled = true,
  draftCoords = [],
  onAddDraftCoord,
  pickedPoint = null,
  onPickPoint,
  evacuationRoute = null,
  flyToTarget = null,
  onSelectFeature,
  onSelectReport,
  onSelectShelter,
  onDeleteFeature,
  heightClass = 'h-[540px]',
  showTopControls = true,
  showLegend = true,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const dataLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const draftLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const snapPreviewMarkerRef = useRef<L.CircleMarker | null>(null);

  const [cursorLatLng, setCursorLatLng] = useState<[number, number]>(WARD_CENTER);
  const [snapBanner, setSnapBanner] = useState<string | null>(null);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);

  // Latest callbacks ref so Leaflet event listeners never go stale
  const interactionRef = useRef({
    interactionMode,
    autoSnapEnabled,
    features,
    onAddDraftCoord,
    onPickPoint,
    onSelectFeature,
    onSelectReport,
    onSelectShelter,
    onDeleteFeature,
  });
  interactionRef.current = {
    interactionMode,
    autoSnapEnabled,
    features,
    onAddDraftCoord,
    onPickPoint,
    onSelectFeature,
    onSelectReport,
    onSelectShelter,
    onDeleteFeature,
  };

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: WARD_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
    });

    L.control.zoom({position: 'bottomright'}).addTo(map);
    L.control.scale({imperial: false, position: 'bottomleft'}).addTo(map);

    const dataGroup = L.layerGroup().addTo(map);
    const draftGroup = L.layerGroup().addTo(map);

    mapRef.current = map;
    dataLayerGroupRef.current = dataGroup;
    draftLayerGroupRef.current = draftGroup;

    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      const raw: [number, number] = [
        Number(e.latlng.lat.toFixed(6)),
        Number(e.latlng.lng.toFixed(6)),
      ];
      setCursorLatLng(raw);

      const {interactionMode: mode, autoSnapEnabled: snapOn, features: feats} =
        interactionRef.current;

      if (mode.startsWith('draw-') && snapOn) {
        const res = snapCoordinateToNetwork(raw, feats, 28);
        if (res.didSnap) {
          setSnapBanner(`Auto-snapped to ${res.snappedToName}`);
          if (!snapPreviewMarkerRef.current) {
            snapPreviewMarkerRef.current = L.circleMarker(res.snapped, {
              radius: 8,
              color: '#0284C7',
              weight: 2.5,
              fillColor: '#38BDF8',
              fillOpacity: 0.45,
            }).addTo(map);
          } else {
            snapPreviewMarkerRef.current.setLatLng(res.snapped);
          }
          return;
        }
      }

      setSnapBanner(null);
      if (snapPreviewMarkerRef.current) {
        snapPreviewMarkerRef.current.remove();
        snapPreviewMarkerRef.current = null;
      }
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      const {
        interactionMode: mode,
        autoSnapEnabled: snapOn,
        features: feats,
        onAddDraftCoord: addCoord,
        onPickPoint: pickPt,
      } = interactionRef.current;

      const raw: [number, number] = [
        Number(e.latlng.lat.toFixed(6)),
        Number(e.latlng.lng.toFixed(6)),
      ];

      if (mode === 'pick-point' && pickPt) {
        pickPt(raw);
        return;
      }

      if (mode.startsWith('draw-') && addCoord) {
        if (snapOn) {
          const snapped = snapCoordinateToNetwork(raw, feats, 28);
          addCoord(snapped.snapped, snapped.snappedToName);
        } else {
          addCoord(raw);
        }
      }
    });

    // ResizeObserver prevents tile clipping when switching tabs or sidebars
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update basemap tile layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }

    if (basemap === 'satellite') {
      tileLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          attribution: 'Tiles &copy; Esri &mdash; Community GIS Overlay',
        }
      ).addTo(map);
    } else {
      tileLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);
    }
  }, [basemap]);

  // Fly to requested target
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyToTarget) return;
    map.flyTo([flyToTarget.lat, flyToTarget.lng], flyToTarget.zoom ?? 17, {
      duration: 0.7,
    });
  }, [flyToTarget]);

  // Render GIS Data Layers
  useEffect(() => {
    const group = dataLayerGroupRef.current;
    if (!group) return;
    group.clearLayers();

    const matchesRisk = (r: RiskLevel) => riskFilter === 'ALL' || r === riskFilter;
    const isDrawingActive = interactionMode !== 'browse';

    // 1. Flood-Risk Zones (Polygons at bottom of vector stack)
    if (layerVisibility.floodZones) {
      for (const f of features) {
        if (f.category !== 'flood_zone' || f.geometryType !== 'Polygon') continue;
        if (categoryFilter !== 'ALL' && categoryFilter !== 'flood_zone') continue;
        if (!matchesRisk(f.riskLevel)) continue;

        const color = RISK_COLORS[f.riskLevel];
        const isVerified = f.verificationStatus === 'Verified';
        const poly = L.polygon(f.coordinates as [number, number][], {
          color: color.hex,
          weight: isVerified ? 3 : 2,
          dashArray: isVerified ? undefined : '6, 4',
          fillColor: color.fillHex,
          fillOpacity: 0.22,
          interactive: !isDrawingActive,
        });

        poly.bindPopup(`
          <div style="min-width:220px;max-width:260px;">
            <div style="font-size:11px;color:#64748b;margin-bottom:3px;">${escapeHtml(f.dataOrigin)}</div>
            <div style="font-weight:700;font-size:13.5px;color:#0f172a;">${escapeHtml(f.name)}</div>
            <div style="font-size:12px;margin-top:4px;font-weight:600;color:${color.hex};">
              ${escapeHtml(t.risk[f.riskLevel])} · ${escapeHtml(f.verificationStatus)}
            </div>
            <p style="font-size:12px;color:#334155;margin:6px 0;">${escapeHtml(f.description)}</p>
            <button data-select-feature="${escapeHtml(f.id)}" style="margin-top:4px;padding:5px 10px;background:#0f172a;color:#fff;border-radius:6px;font-size:11.5px;font-weight:600;cursor:pointer;border:none;">
              Inspect Zone
            </button>
          </div>
        `);

        poly.on('popupopen', (ev) => {
          const btn = ev.popup
            .getElement()
            ?.querySelector(`[data-select-feature="${f.id}"]`) as HTMLButtonElement | null;
          if (btn) {
            btn.onclick = () => interactionRef.current.onSelectFeature?.(f);
          }
        });

        poly.addTo(group);
      }
    }

    // 2. Narrow Streets & Lanes (Polylines)
    if (layerVisibility.streets) {
      for (const f of features) {
        if (f.category !== 'street' || f.geometryType !== 'LineString') continue;
        if (categoryFilter !== 'ALL' && categoryFilter !== 'street') continue;
        if (!matchesRisk(f.riskLevel)) continue;

        const color = RISK_COLORS[f.riskLevel];
        const line = L.polyline(f.coordinates as [number, number][], {
          color: color.hex,
          weight: 5,
          opacity: 0.9,
          interactive: !isDrawingActive,
        });

        line.bindPopup(`
          <div style="min-width:210px;">
            <div style="font-size:11px;color:#64748b;">Narrow Street / Lane · ${escapeHtml(f.verificationStatus)}</div>
            <div style="font-weight:700;font-size:13px;color:#0f172a;margin-top:2px;">${escapeHtml(f.name)}</div>
            <div style="font-size:12px;font-weight:600;color:${color.hex};margin-top:3px;">${escapeHtml(t.risk[f.riskLevel])}</div>
            <p style="font-size:12px;color:#334155;margin:6px 0;">${escapeHtml(f.description)}</p>
            <div style="font-size:10.5px;color:#64748b;">${escapeHtml(f.dataOrigin)}</div>
          </div>
        `);
        line.on('click', () => interactionRef.current.onSelectFeature?.(f));
        line.addTo(group);
      }
    }

    // 3. Drainage Systems & Blocked Drains
    if (layerVisibility.drains) {
      for (const f of features) {
        if (f.category !== 'drain' && f.category !== 'blocked_drain') continue;
        if (categoryFilter !== 'ALL' && categoryFilter !== f.category) continue;
        if (!matchesRisk(f.riskLevel)) continue;

        if (f.geometryType === 'LineString') {
          const line = L.polyline(f.coordinates as [number, number][], {
            color: '#0284C7',
            weight: 4,
            dashArray: '8, 5',
            interactive: !isDrawingActive,
          });
          line.bindPopup(`
            <div style="min-width:210px;">
              <div style="font-size:11px;color:#0369a1;font-weight:600;">Stormwater Drainage Line</div>
              <div style="font-weight:700;font-size:13px;color:#0f172a;margin-top:2px;">${escapeHtml(f.name)}</div>
              <p style="font-size:12px;color:#334155;margin:6px 0;">${escapeHtml(f.description)}</p>
              <div style="font-size:10.5px;color:#64748b;">${escapeHtml(f.dataOrigin)}</div>
            </div>
          `);
          line.on('click', () => interactionRef.current.onSelectFeature?.(f));
          line.addTo(group);
        } else if (f.geometryType === 'Point') {
          const [lat, lng] = f.coordinates as [number, number];
          const marker = L.marker([lat, lng], {
            icon: createMarkerSvgIcon(f.category, f.riskLevel, f.verificationStatus === 'Verified'),
            interactive: !isDrawingActive,
          });
          marker.bindPopup(`
            <div style="min-width:210px;">
              <div style="font-size:11px;color:#ea580c;font-weight:600;">Blocked Drain Chokepoint</div>
              <div style="font-weight:700;font-size:13px;color:#0f172a;margin-top:2px;">${escapeHtml(f.name)}</div>
              <div style="font-size:11.5px;font-family:monospace;color:#475569;margin-top:2px;">${lat.toFixed(5)}, ${lng.toFixed(5)}</div>
              <p style="font-size:12px;color:#334155;margin:6px 0;">${escapeHtml(f.description)}</p>
              <div style="font-size:10.5px;color:#64748b;">${escapeHtml(f.dataOrigin)}</div>
            </div>
          `);
          marker.on('click', () => interactionRef.current.onSelectFeature?.(f));
          marker.addTo(group);
        }
      }
    }

    // 4. Waterlogging Spots
    if (layerVisibility.waterlogging) {
      for (const f of features) {
        if (f.category !== 'waterlogging') continue;
        if (categoryFilter !== 'ALL' && categoryFilter !== 'waterlogging') continue;
        if (!matchesRisk(f.riskLevel)) continue;

        if (f.geometryType === 'Point') {
          const [lat, lng] = f.coordinates as [number, number];
          const marker = L.marker([lat, lng], {
            icon: createMarkerSvgIcon('waterlogging', f.riskLevel, f.verificationStatus === 'Verified'),
            interactive: !isDrawingActive,
          });
          marker.bindPopup(`
            <div style="min-width:210px;">
              <div style="font-size:11px;color:#dc2626;font-weight:600;">Waterlogging Hotspot</div>
              <div style="font-weight:700;font-size:13px;color:#0f172a;margin-top:2px;">${escapeHtml(f.name)}</div>
              <p style="font-size:12px;color:#334155;margin:6px 0;">${escapeHtml(f.description)}</p>
              <div style="font-size:10.5px;color:#64748b;">${escapeHtml(f.dataOrigin)}</div>
            </div>
          `);
          marker.on('click', () => interactionRef.current.onSelectFeature?.(f));
          marker.addTo(group);
        }
      }
    }

    // 5. Mapped Houses
    if (layerVisibility.houses) {
      for (const f of features) {
        if (f.category !== 'house') continue;
        if (categoryFilter !== 'ALL' && categoryFilter !== 'house') continue;
        if (!matchesRisk(f.riskLevel)) continue;

        if (f.geometryType === 'Point') {
          const [lat, lng] = f.coordinates as [number, number];
          const color = RISK_COLORS[f.riskLevel];
          const marker = L.marker([lat, lng], {
            icon: createMarkerSvgIcon('house', f.riskLevel, f.verificationStatus === 'Verified'),
            interactive: !isDrawingActive,
          });

          const annText =
            f.annotations.length > 0
              ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;padding:5px 7px;border-radius:5px;font-size:11px;color:#334155;margin-bottom:6px;">“${escapeHtml(
                  f.annotations[0].text
                )}”</div>`
              : '';

          marker.bindPopup(`
            <div style="min-width:225px;max-width:265px;">
              <div style="font-size:10.5px;color:#64748b;">${escapeHtml(f.dataOrigin)}</div>
              <div style="font-weight:700;font-size:13.5px;color:#0f172a;margin-top:2px;">${escapeHtml(f.name)}</div>
              <div style="font-size:12px;font-weight:600;color:${color.hex};margin-top:2px;">
                ${escapeHtml(t.risk[f.riskLevel])} · ${escapeHtml(f.verificationStatus)}
              </div>
              <div style="font-size:11px;font-family:monospace;color:#475569;margin-top:2px;">${lat.toFixed(5)}, ${lng.toFixed(5)}</div>
              <p style="font-size:12px;color:#334155;margin:6px 0;">${escapeHtml(f.description)}</p>
              ${annText}
              <div style="display:flex;gap:6px;margin-top:6px;">
                <button data-inspect-house="${escapeHtml(f.id)}" style="padding:4px 9px;background:#0f172a;color:#fff;border-radius:5px;font-size:11px;font-weight:600;border:none;cursor:pointer;">
                  Select
                </button>
                ${
                  onDeleteFeature
                    ? `<button data-delete-house="${escapeHtml(f.id)}" style="padding:4px 9px;background:#fee2e2;color:#b91c1c;border-radius:5px;font-size:11px;font-weight:600;border:none;cursor:pointer;">Remove</button>`
                    : ''
                }
              </div>
            </div>
          `);

          marker.on('popupopen', (ev) => {
            const el = ev.popup.getElement();
            const selBtn = el?.querySelector(`[data-inspect-house="${f.id}"]`) as HTMLButtonElement | null;
            if (selBtn) selBtn.onclick = () => interactionRef.current.onSelectFeature?.(f);
            const delBtn = el?.querySelector(`[data-delete-house="${f.id}"]`) as HTMLButtonElement | null;
            if (delBtn) {
              delBtn.onclick = () => {
                marker.closePopup();
                interactionRef.current.onDeleteFeature?.(f.id);
              };
            }
          });

          marker.addTo(group);
        } else if (f.geometryType === 'Polygon') {
          const poly = L.polygon(f.coordinates as [number, number][], {
            color: RISK_COLORS[f.riskLevel].hex,
            weight: 2,
            fillOpacity: 0.3,
            interactive: !isDrawingActive,
          });
          poly.bindPopup(`<strong>${escapeHtml(f.name)}</strong><br/>${escapeHtml(f.description)}`);
          poly.addTo(group);
        }
      }
    }

    // 6. Community Flood Reports
    if (layerVisibility.reports && categoryFilter === 'ALL') {
      for (const r of reports) {
        if (r.status === 'Rejected') continue;
        if (!matchesRisk(r.severity)) continue;

        const color = RISK_COLORS[r.severity];
        const marker = L.marker([r.latitude, r.longitude], {
          icon: createMarkerSvgIcon('report', r.severity, r.status === 'Verified'),
          interactive: !isDrawingActive,
        });

        const photoBlock = r.photoUrl
          ? `<img src="${escapeHtml(r.photoUrl)}" alt="${escapeHtml(r.category)}" referrerpolicy="no-referrer" style="width:100%;height:96px;object-fit:cover;border-radius:6px;margin-top:6px;border:1px solid #e2e8f0;" />`
          : '';

        marker.bindPopup(`
          <div style="min-width:225px;max-width:265px;">
            <div style="font-size:10.5px;color:#64748b;">Report · ${escapeHtml(r.status)}</div>
            <div style="font-weight:700;font-size:13.5px;color:#0f172a;margin-top:2px;">${escapeHtml(r.category)} — ${escapeHtml(r.locationName)}</div>
            <div style="font-size:12px;font-weight:600;color:${color.hex};margin-top:2px;">${escapeHtml(t.risk[r.severity])}</div>
            ${photoBlock}
            <p style="font-size:12px;color:#334155;margin:6px 0;">${escapeHtml(r.description)}</p>
            <div style="font-size:10.5px;color:#64748b;">By ${escapeHtml(r.reportedBy)}</div>
            <button data-select-report="${escapeHtml(r.id)}" style="margin-top:6px;padding:4px 10px;background:#0f172a;color:#fff;border-radius:5px;font-size:11px;font-weight:600;border:none;cursor:pointer;">
              Inspect Report
            </button>
          </div>
        `);

        marker.on('popupopen', (ev) => {
          const btn = ev.popup
            .getElement()
            ?.querySelector(`[data-select-report="${r.id}"]`) as HTMLButtonElement | null;
          if (btn) btn.onclick = () => interactionRef.current.onSelectReport?.(r);
        });

        marker.addTo(group);
      }
    }

    // 7. Safe Shelters
    if (layerVisibility.shelters && categoryFilter === 'ALL') {
      for (const s of shelters) {
        const marker = L.marker([s.latitude, s.longitude], {
          icon: createMarkerSvgIcon('shelter', 'LOW', true),
          interactive: !isDrawingActive,
        });

        marker.bindPopup(`
          <div style="min-width:230px;max-width:270px;">
            <div style="font-size:10.5px;color:#059669;font-weight:700;">SAFE SHELTER (DEMO)</div>
            <div style="font-weight:700;font-size:13.5px;color:#0f172a;margin-top:2px;">${escapeHtml(s.name)}</div>
            <div style="font-size:12px;color:#334155;margin-top:4px;">
              Capacity: <strong>${s.capacity}</strong> · Water: <strong>${s.drinkingWater ? 'Yes' : 'No'}</strong> · Toilets: <strong>${s.toilets ? 'Yes' : 'No'}</strong>
            </div>
            <p style="font-size:11.5px;color:#475569;margin:5px 0;">${escapeHtml(s.accessibilityNotes)}</p>
            <button data-select-shelter="${escapeHtml(s.id)}" style="margin-top:4px;padding:5px 10px;background:#059669;color:#fff;border-radius:5px;font-size:11.5px;font-weight:600;border:none;cursor:pointer;">
              Calculate Evacuation Route
            </button>
          </div>
        `);

        marker.on('popupopen', (ev) => {
          const btn = ev.popup
            .getElement()
            ?.querySelector(`[data-select-shelter="${s.id}"]`) as HTMLButtonElement | null;
          if (btn) btn.onclick = () => interactionRef.current.onSelectShelter?.(s);
        });

        marker.addTo(group);
      }
    }

    // 8. Suggested Safe Evacuation Route (DEMO / UNVERIFIED)
    if (layerVisibility.evacuationRoute && evacuationRoute) {
      // White outer casing + Emerald/Blue inner safe corridor line
      L.polyline(evacuationRoute.pathLatLngs, {
        color: '#ffffff',
        weight: 9,
        opacity: 0.92,
      }).addTo(group);

      const routeLine = L.polyline(evacuationRoute.pathLatLngs, {
        color: '#0284C7',
        weight: 5,
        dashArray: '10, 6',
      }).addTo(group);

      routeLine.bindPopup(`
        <div style="min-width:220px;">
          <div style="font-size:11px;font-weight:700;color:#b45309;">DEMO / UNVERIFIED EVACUATION ROUTE</div>
          <div style="font-size:13px;font-weight:700;color:#0f172a;margin-top:2px;">To ${escapeHtml(evacuationRoute.shelter.name)}</div>
          <div style="font-size:12px;color:#334155;margin-top:4px;">
            Distance: <strong>${evacuationRoute.distanceMeters} m</strong> (~${evacuationRoute.estimatedWalkMinutes} min walk)
          </div>
          <div style="font-size:11px;color:#475569;margin-top:4px;">Avoids Critical & High flooded inner cross lanes.</div>
        </div>
      `);

      L.circleMarker(evacuationRoute.originLatLng, {
        radius: 8,
        color: '#0f172a',
        weight: 2.5,
        fillColor: '#38BDF8',
        fillOpacity: 1,
      })
        .bindTooltip(`Start: ${evacuationRoute.originLabel}`, {permanent: false})
        .addTo(group);
    }
  }, [
    features,
    reports,
    shelters,
    layerVisibility,
    riskFilter,
    categoryFilter,
    evacuationRoute,
    interactionMode,
    t,
    onDeleteFeature,
  ]);

  // Render active drawing vertices or picked location pin
  useEffect(() => {
    const draftGroup = draftLayerGroupRef.current;
    if (!draftGroup) return;
    draftGroup.clearLayers();

    if (pickedPoint) {
      L.circleMarker(pickedPoint, {
        radius: 10,
        color: '#DC2626',
        weight: 3,
        fillColor: '#FCA5A5',
        fillOpacity: 0.85,
      })
        .bindTooltip(`Selected: ${pickedPoint[0].toFixed(5)}, ${pickedPoint[1].toFixed(5)}`, {
          permanent: true,
          direction: 'top',
          offset: [0, -10],
        })
        .addTo(draftGroup);
    }

    if (draftCoords.length > 0) {
      for (const pt of draftCoords) {
        L.circleMarker(pt, {
          radius: 6,
          color: '#0F172A',
          weight: 2,
          fillColor: '#F97316',
          fillOpacity: 1,
        }).addTo(draftGroup);
      }

      if (interactionMode === 'draw-LineString' && draftCoords.length >= 2) {
        L.polyline(draftCoords, {
          color: '#EA580C',
          weight: 4,
          dashArray: '6, 4',
        }).addTo(draftGroup);
      } else if (interactionMode === 'draw-Polygon' && draftCoords.length >= 2) {
        L.polygon(draftCoords, {
          color: '#EA580C',
          weight: 3,
          dashArray: '6, 4',
          fillColor: '#FB923C',
          fillOpacity: 0.25,
        }).addTo(draftGroup);
      }
    }
  }, [draftCoords, pickedPoint, interactionMode]);

  const handleLocateGPS = () => {
    if (!navigator.geolocation) {
      setGpsStatus('GPS not supported in this browser; centered on Ward 148.');
      mapRef.current?.flyTo(WARD_CENTER, 17);
      return;
    }
    setGpsStatus('Locating GPS...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setGpsStatus(`GPS active (${coords[0].toFixed(4)}, ${coords[1].toFixed(4)})`);
        mapRef.current?.flyTo(coords, 17);
        if (interactionMode === 'pick-point' && onPickPoint) {
          onPickPoint([Number(coords[0].toFixed(6)), Number(coords[1].toFixed(6))]);
        }
      },
      () => {
        setGpsStatus('GPS permission unavailable — centered on Ward 148 Ejipura Demo.');
        mapRef.current?.flyTo(WARD_CENTER, 16);
      },
      {timeout: 6000}
    );
  };

  return (
    <div className="relative w-full rounded-lg border border-slate-200 bg-slate-100 overflow-hidden">
      {/* Top Map Operational Toolbar */}
      {showTopControls && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-white border-b border-slate-200 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Locality Selector */}
            <label htmlFor="locality-preset-select" className="sr-only">
              Jump to Settlement Sector
            </label>
            <select
              id="locality-preset-select"
              onChange={(e) => {
                const found = LOCALITY_PRESETS.find((p) => p.id === e.target.value);
                if (found && mapRef.current) {
                  mapRef.current.flyTo(found.center, found.zoom, {duration: 0.6});
                }
              }}
              className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-sky-600"
            >
              {LOCALITY_PRESETS.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleLocateGPS}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              aria-label={t.common.locateMe}
            >
              <LocateFixed className="w-3.5 h-3.5 text-sky-700" />
              <span>{t.common.locateMe}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Basemap Segmented Control */}
            <div className="inline-flex items-center p-0.5 rounded-md bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => onBasemapChange('osm')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  basemap === 'osm'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>{t.common.basemapOsm}</span>
              </button>
              <button
                type="button"
                onClick={() => onBasemapChange('satellite')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  basemap === 'satellite'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Satellite className="w-3.5 h-3.5" />
                <span>{t.common.basemapSatellite}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Drawing / Picking Instruction Bar */}
      {interactionMode !== 'browse' && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-900 text-white text-xs">
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-orange-400 shrink-0" />
            <span>
              {interactionMode === 'pick-point'
                ? 'Click anywhere on the map to set exact Latitude & Longitude.'
                : interactionMode === 'draw-Point'
                ? 'Click on the map roof/spot to place your point marker.'
                : 'Click points along the map to sketch vertices, then click "Complete Shape".'}
            </span>
          </div>
          {snapBanner && (
            <span className="font-mono text-sky-300 whitespace-nowrap shrink-0">{snapBanner}</span>
          )}
        </div>
      )}

      {/* Map Viewport */}
      <div
        ref={containerRef}
        className={`w-full ${heightClass} ${
          interactionMode !== 'browse' ? 'cursor-crosshair' : ''
        }`}
        aria-label="Interactive FloodLane GIS Map"
      />

      {/* Bottom Telemetry Coordinate Readout & Compact Accessible Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 bg-white border-t border-slate-200 text-xs text-slate-600">
        <div className="flex items-center gap-2 font-mono tabular-nums text-[11px] text-slate-700">
          <span>
            LAT {cursorLatLng[0].toFixed(5)} · LNG {cursorLatLng[1].toFixed(5)}
          </span>
          {gpsStatus && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-sans text-sky-700">{gpsStatus}</span>
            </>
          )}
        </div>

        {showLegend && (
          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1 font-medium text-slate-700">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              Legend:
            </span>
            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
              <span aria-hidden="true">●</span> Low
            </span>
            <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
              <span aria-hidden="true">▲</span> Medium
            </span>
            <span className="inline-flex items-center gap-1 text-orange-700 font-semibold">
              <span aria-hidden="true">◆</span> High
            </span>
            <span className="inline-flex items-center gap-1 text-red-700 font-bold">
              <span aria-hidden="true">■</span> Critical
            </span>
            <span aria-hidden="true" className="text-slate-300">
              |
            </span>
            <span className="text-slate-600">Dashed: Community/Demo (Unverified)</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-900 font-medium">Double-Ring: Verified</span>
          </div>
        )}
      </div>
    </div>
  );
};
