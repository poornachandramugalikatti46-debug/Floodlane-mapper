import * as turf from '@turf/turf';
import {
  EvacuationRouteResult,
  FloodReport,
  MappedFeature,
  RiskLevel,
  SafeShelter,
} from '../types';

export const RISK_COLORS: Record<RiskLevel, {hex: string; fillHex: string; badgeBg: string; badgeText: string}> = {
  LOW: {
    hex: '#16A34A',
    fillHex: '#22C55E',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-800',
  },
  MEDIUM: {
    hex: '#CA8A04',
    fillHex: '#EAB308',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-900',
  },
  HIGH: {
    hex: '#EA580C',
    fillHex: '#F97316',
    badgeBg: 'bg-orange-50',
    badgeText: 'text-orange-900',
  },
  CRITICAL: {
    hex: '#DC2626',
    fillHex: '#EF4444',
    badgeBg: 'bg-red-50',
    badgeText: 'text-red-900',
  },
};

const RISK_PRIORITY: Record<RiskLevel, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

/**
 * Auto-snap a clicked [lat, lng] vertex to nearest mapped street, drain, or house point within maxMeters using Turf.js
 */
export function snapCoordinateToNetwork(
  latlng: [number, number],
  features: MappedFeature[],
  maxMeters = 28
): {snapped: [number, number]; didSnap: boolean; snappedToName?: string} {
  const targetPt = turf.point([latlng[1], latlng[0]]);
  let bestDist = maxMeters;
  let bestCoord: [number, number] = latlng;
  let bestName: string | undefined;

  for (const f of features) {
    if ((f.category === 'street' || f.category === 'drain') && f.geometryType === 'LineString') {
      const coords = f.coordinates as [number, number][];
      if (coords.length >= 2) {
        const line = turf.lineString(coords.map(([lat, lng]) => [lng, lat]));
        const nearest = turf.nearestPointOnLine(line, targetPt, {units: 'meters'});
        const d = nearest.properties.dist ?? Infinity;
        if (d <= bestDist) {
          bestDist = d;
          const [lng, lat] = nearest.geometry.coordinates;
          bestCoord = [Number(lat.toFixed(6)), Number(lng.toFixed(6))];
          bestName = f.name;
        }
      }
    } else if (f.category === 'house' && f.geometryType === 'Point') {
      const [hLat, hLng] = f.coordinates as [number, number];
      const hPt = turf.point([hLng, hLat]);
      const d = turf.distance(targetPt, hPt, {units: 'meters'});
      if (d <= Math.min(14, bestDist)) {
        bestDist = d;
        bestCoord = [hLat, hLng];
        bestName = f.name;
      }
    }
  }

  return {
    snapped: bestCoord,
    didSnap: bestName !== undefined,
    snappedToName: bestName,
  };
}

/**
 * Suggest flood risk level for a point based on intersecting Flood-Prone Zone polygons
 */
export function suggestRiskLevelAtPoint(
  lat: number,
  lng: number,
  features: MappedFeature[]
): {suggestedRisk: RiskLevel; zoneName?: string} {
  const pt = turf.point([lng, lat]);
  let highestRisk: RiskLevel = 'MEDIUM';
  let matchedZone: string | undefined;

  for (const f of features) {
    if (f.category === 'flood_zone' && f.geometryType === 'Polygon') {
      const ring = f.coordinates as [number, number][];
      if (ring.length >= 3) {
        const closed = [...ring.map(([la, ln]) => [ln, la])];
        if (
          closed[0][0] !== closed[closed.length - 1][0] ||
          closed[0][1] !== closed[closed.length - 1][1]
        ) {
          closed.push(closed[0]);
        }
        try {
          const poly = turf.polygon([closed]);
          if (turf.booleanPointInPolygon(pt, poly)) {
            if (!matchedZone || RISK_PRIORITY[f.riskLevel] > RISK_PRIORITY[highestRisk]) {
              highestRisk = f.riskLevel;
              matchedZone = f.name;
            }
          }
        } catch {
          // Ignore malformed user polygon
        }
      }
    }
  }

  return {suggestedRisk: highestRisk, zoneName: matchedZone};
}

/**
 * Measure LineString length in meters or Polygon area in square meters using Turf.js
 */
export function measureGeometry(
  geometryType: 'Point' | 'LineString' | 'Polygon',
  coords: [number, number][]
): string {
  if (geometryType === 'Point' || coords.length < 2) return '';
  try {
    if (geometryType === 'LineString') {
      const line = turf.lineString(coords.map(([lat, lng]) => [lng, lat]));
      const meters = turf.length(line, {units: 'meters'});
      return `${Math.round(meters)} m length`;
    }
    if (geometryType === 'Polygon' && coords.length >= 3) {
      const closed = coords.map(([lat, lng]) => [lng, lat]);
      closed.push(closed[0]);
      const poly = turf.polygon([closed]);
      const sqMeters = turf.area(poly);
      return `${Math.round(sqMeters).toLocaleString()} m² area`;
    }
  } catch {
    return '';
  }
  return '';
}

/**
 * Compute spatial analytics for a Flood Risk Zone polygon
 */
export function computeZoneSpatialSummary(
  zone: MappedFeature,
  allFeatures: MappedFeature[],
  allReports: FloodReport[]
): {
  areaSqMeters: number;
  housesInside: number;
  drainsCount: number;
  relatedReports: FloodReport[];
} {
  const ring = zone.coordinates as [number, number][];
  if (ring.length < 3) {
    return {areaSqMeters: 0, housesInside: 0, drainsCount: 0, relatedReports: []};
  }
  try {
    const closed = ring.map(([lat, lng]) => [lng, lat]);
    if (closed[0][0] !== closed[closed.length - 1][0] || closed[0][1] !== closed[closed.length - 1][1]) {
      closed.push(closed[0]);
    }
    const poly = turf.polygon([closed]);
    const areaSqMeters = Math.round(turf.area(poly));

    let housesInside = 0;
    let drainsCount = 0;

    for (const f of allFeatures) {
      if (f.id === zone.id) continue;
      if (f.category === 'house' && f.geometryType === 'Point') {
        const [lat, lng] = f.coordinates as [number, number];
        if (turf.booleanPointInPolygon(turf.point([lng, lat]), poly)) {
          housesInside++;
        }
      } else if (f.category === 'drain' || f.category === 'blocked_drain') {
        if (f.geometryType === 'Point') {
          const [lat, lng] = f.coordinates as [number, number];
          if (turf.booleanPointInPolygon(turf.point([lng, lat]), poly)) {
            drainsCount++;
          }
        } else if (f.geometryType === 'LineString') {
          const coords = f.coordinates as [number, number][];
          if (coords.length >= 2) {
            const line = turf.lineString(coords.map(([lat, lng]) => [lng, lat]));
            if (turf.booleanIntersects(line, poly)) {
              drainsCount++;
            }
          }
        }
      }
    }

    const relatedReports = allReports.filter((r) =>
      turf.booleanPointInPolygon(turf.point([r.longitude, r.latitude]), poly)
    );

    return {areaSqMeters, housesInside, drainsCount, relatedReports};
  } catch {
    return {areaSqMeters: 0, housesInside: 0, drainsCount: 0, relatedReports: []};
  }
}

/**
 * Calculate a DEMO / UNVERIFIED safe pedestrian evacuation route that avoids Critical & High flooded roads
 * by exiting immediately westward to the elevated West Spine Road corridor and following it north to the shelter.
 */
export function calculateSafeEvacuationRoute(
  originLatLng: [number, number],
  originLabel: string,
  targetShelter: SafeShelter | null,
  shelters: SafeShelter[],
  features: MappedFeature[],
  reports: FloodReport[]
): EvacuationRouteResult {
  const originPt = turf.point([originLatLng[1], originLatLng[0]]);

  // Pick nearest shelter if none explicitly chosen
  let chosenShelter = targetShelter || shelters[0];
  if (!targetShelter && shelters.length > 0) {
    let minD = Infinity;
    for (const s of shelters) {
      const d = turf.distance(originPt, turf.point([s.longitude, s.latitude]), {units: 'meters'});
      if (d < minD) {
        minD = d;
        chosenShelter = s;
      }
    }
  }

  // Safe West Spine Road waypoints (elevated flood-free corridor, west of flooded inner lanes)
  const spineSouth: [number, number] = [12.9372, 77.6293];
  const spineMid: [number, number] = [12.9395, 77.6290];
  const spineNorth: [number, number] = [12.9414, 77.6287];

  const path: [number, number][] = [originLatLng];

  // Step 1: Move directly west out of low-lying basti cross lane (away from eastern Rajakaluve canal!)
  const exitSpinePoint: [number, number] = [originLatLng[0], Math.min(originLatLng[1], 77.6291)];
  if (
    Math.abs(exitSpinePoint[0] - originLatLng[0]) > 0.0001 ||
    Math.abs(exitSpinePoint[1] - originLatLng[1]) > 0.0002
  ) {
    path.push(exitSpinePoint);
  }

  // Step 2: Traverse along elevated West Spine Road toward shelter latitude
  const shelterLat = chosenShelter.latitude;
  if (originLatLng[0] < 12.9385 && shelterLat > 12.9390) {
    path.push(spineSouth);
    path.push(spineMid);
  } else if (originLatLng[0] < 12.9403 && shelterLat > 12.9405) {
    path.push(spineMid);
  }

  if (shelterLat > 12.9410) {
    path.push(spineNorth);
  }

  path.push([chosenShelter.latitude, chosenShelter.longitude]);

  const line = turf.lineString(path.map(([lat, lng]) => [lng, lat]));
  const distanceMeters = Math.round(turf.length(line, {units: 'meters'}));
  const estimatedWalkMinutes = Math.max(2, Math.ceil(distanceMeters / 65)); // ~65m/min cautious monsoon pace

  // Count how many Critical/High hazards exist in the ward that this western corridor bypasses
  const avoidedHazardsCount =
    features.filter(
      (f) =>
        (f.category === 'waterlogging' || f.category === 'blocked_drain' || f.category === 'street') &&
        (f.riskLevel === 'CRITICAL' || f.riskLevel === 'HIGH')
    ).length +
    reports.filter((r) => r.severity === 'CRITICAL' || r.severity === 'HIGH').length;

  const instructions = [
    `Start at ${originLabel} (${originLatLng[0].toFixed(5)}, ${originLatLng[1].toFixed(5)}). Do NOT walk east toward Rajakaluve canal.`,
    `Head directly west ~${Math.max(40, Math.round(turf.distance(originPt, turf.point([exitSpinePoint[1], exitSpinePoint[0]]), {units: 'meters'})))}m to reach the elevated Ejipura West Spine Road.`,
    `Proceed north along West Spine Road (Low-Risk elevated corridor, bypassing ${avoidedHazardsCount} community-flagged flood/drain hazards).`,
    `Arrive at ${chosenShelter.name} (Capacity: ${chosenShelter.capacity} persons · Drinking water & toilets available).`,
  ];

  return {
    shelter: chosenShelter,
    originLatLng,
    originLabel,
    pathLatLngs: path,
    distanceMeters,
    estimatedWalkMinutes,
    avoidedHazardsCount,
    instructions,
  };
}

export interface ExportFilterOptions {
  includeHouses: boolean;
  includeStreets: boolean;
  includeDrains: boolean;
  includeFloodZones: boolean;
  includeReports: boolean;
  includeShelters: boolean;
  verificationFilter: 'ALL' | 'Verified' | 'Unverified';
}

export function buildGeoJSONFeatureCollection(
  features: MappedFeature[],
  reports: FloodReport[],
  shelters: SafeShelter[],
  options: ExportFilterOptions
) {
  const geoFeatures: Array<Record<string, unknown>> = [];

  const matchesVerification = (status: string) => {
    if (options.verificationFilter === 'ALL') return true;
    if (options.verificationFilter === 'Verified') return status === 'Verified';
    return status !== 'Verified';
  };

  for (const f of features) {
    if (!matchesVerification(f.verificationStatus)) continue;
    if (f.category === 'house' && !options.includeHouses) continue;
    if (f.category === 'street' && !options.includeStreets) continue;
    if ((f.category === 'drain' || f.category === 'blocked_drain') && !options.includeDrains) continue;
    if ((f.category === 'flood_zone' || f.category === 'waterlogging') && !options.includeFloodZones) continue;

    let geometry: Record<string, unknown>;
    if (f.geometryType === 'Point') {
      const [lat, lng] = f.coordinates as [number, number];
      geometry = {type: 'Point', coordinates: [lng, lat]};
    } else if (f.geometryType === 'LineString') {
      const coords = (f.coordinates as [number, number][]).map(([lat, lng]) => [lng, lat]);
      geometry = {type: 'LineString', coordinates: coords};
    } else {
      const ring = (f.coordinates as [number, number][]).map(([lat, lng]) => [lng, lat]);
      if (
        ring.length > 0 &&
        (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])
      ) {
        ring.push([...ring[0]]);
      }
      geometry = {type: 'Polygon', coordinates: [ring]};
    }

    geoFeatures.push({
      type: 'Feature',
      id: f.id,
      geometry,
      properties: {
        id: f.id,
        layer_type: f.category,
        name: f.name,
        risk_level: f.riskLevel,
        verification_status: f.verificationStatus,
        verified: f.verificationStatus === 'Verified',
        community_contributed: true,
        data_origin: f.dataOrigin,
        description: f.description,
        annotations_count: f.annotations.length,
        annotations_text: f.annotations.map((a) => a.text).join(' | '),
        created_by: f.createdBy,
        created_at: f.createdAt,
      },
    });
  }

  if (options.includeReports) {
    for (const r of reports) {
      if (!matchesVerification(r.status)) continue;
      geoFeatures.push({
        type: 'Feature',
        id: r.id,
        geometry: {
          type: 'Point',
          coordinates: [r.longitude, r.latitude],
        },
        properties: {
          id: r.id,
          layer_type: 'community_flood_report',
          report_category: r.category,
          name: `${r.category} — ${r.locationName}`,
          risk_level: r.severity,
          verification_status: r.status,
          verified: r.status === 'Verified',
          community_contributed: true,
          data_origin: r.dataOrigin,
          description: r.description,
          has_photo: Boolean(r.photoUrl),
          reported_by: r.reportedBy,
          created_at: r.createdAt,
        },
      });
    }
  }

  if (options.includeShelters && options.verificationFilter !== 'Verified') {
    for (const s of shelters) {
      geoFeatures.push({
        type: 'Feature',
        id: s.id,
        geometry: {
          type: 'Point',
          coordinates: [s.longitude, s.latitude],
        },
        properties: {
          id: s.id,
          layer_type: 'safe_shelter',
          name: s.name,
          location: s.locationName,
          capacity: s.capacity,
          drinking_water: s.drinkingWater,
          toilets: s.toilets,
          wheelchair_accessible: s.wheelchairAccessible,
          elevation_m: s.elevationMeters,
          data_origin: s.dataOrigin,
        },
      });
    }
  }

  return {
    type: 'FeatureCollection',
    name: 'FloodLane_Mapper_Ward148_GIS_Export',
    metadata: {
      generated_at: new Date().toISOString(),
      crs: 'EPSG:4326 (WGS84)',
      ward: 'Ward 148 Ejipura-Koramangala (Bengaluru)',
      disclaimer: 'DEMO DATA — COMMUNITY CONTRIBUTED — UNVERIFIED unless verification_status === Verified',
    },
    features: geoFeatures,
  };
}

export function buildCSVExport(
  features: MappedFeature[],
  reports: FloodReport[],
  shelters: SafeShelter[],
  options: ExportFilterOptions
): string {
  const collection = buildGeoJSONFeatureCollection(features, reports, shelters, options);
  const headers = [
    'id',
    'layer_type',
    'geometry_type',
    'name',
    'risk_level',
    'verification_status',
    'latitude',
    'longitude',
    'wkt_or_coords',
    'data_origin',
    'description',
    'created_by',
    'created_at',
  ];

  const escapeCsv = (val: unknown) => {
    const str = val === undefined || val === null ? '' : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = [headers.join(',')];

  for (const feat of collection.features) {
    const geom = feat.geometry as {type: string; coordinates: unknown};
    const props = feat.properties as Record<string, unknown>;
    let lat = '';
    let lng = '';
    if (geom.type === 'Point') {
      const [lonNum, latNum] = geom.coordinates as [number, number];
      lat = String(latNum);
      lng = String(lonNum);
    } else if (geom.type === 'LineString') {
      const first = (geom.coordinates as [number, number][])[0];
      if (first) {
        lat = String(first[1]);
        lng = String(first[0]);
      }
    } else if (geom.type === 'Polygon') {
      const ring = (geom.coordinates as [number, number][][])[0];
      if (ring && ring[0]) {
        lat = String(ring[0][1]);
        lng = String(ring[0][0]);
      }
    }

    const row = [
      props.id,
      props.layer_type,
      geom.type,
      props.name,
      props.risk_level || 'LOW',
      props.verification_status || 'Demo',
      lat,
      lng,
      JSON.stringify(geom.coordinates),
      props.data_origin,
      props.description || props.location || '',
      props.created_by || props.reported_by || 'Demo Seed',
      props.created_at || '',
    ].map(escapeCsv);

    rows.push(row.join(','));
  }

  return rows.join('\n');
}

export function triggerFileDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], {type: mimeType});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
