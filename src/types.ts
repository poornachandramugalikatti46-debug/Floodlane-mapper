export type LanguageCode = 'en' | 'kn' | 'hi';

export type NavSection =
  | 'dashboard'
  | 'live-map'
  | 'community-mapping'
  | 'report-issue'
  | 'risk-analysis'
  | 'safe-shelters'
  | 'community-reports'
  | 'gis-export'
  | 'admin-panel'
  | 'settings';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type VerificationStatus = 'Pending' | 'Reviewed' | 'Verified' | 'Rejected';

export type FeatureCategory =
  | 'house'
  | 'street'
  | 'drain'
  | 'blocked_drain'
  | 'waterlogging'
  | 'flood_zone';

export type GeometryKind = 'Point' | 'LineString' | 'Polygon';

export type ReportCategory =
  | 'Waterlogging'
  | 'Blocked Drain'
  | 'Overflowing Drain'
  | 'Flooded House'
  | 'Road Flooding';

export interface CommunityAnnotation {
  id: string;
  text: string;
  author: string;
  language: LanguageCode;
  timestamp: string;
}

export interface MappedFeature {
  id: string;
  name: string;
  category: FeatureCategory;
  geometryType: GeometryKind;
  /**
   * Coordinates stored as [lat, lng] pairs for Leaflet ease:
   * - Point: [lat, lng]
   * - LineString: [lat, lng][]
   * - Polygon: [lat, lng][] (outer ring)
   * Converted to RFC 7946 [lng, lat] automatically on GeoJSON export.
   */
  coordinates: [number, number] | [number, number][];
  riskLevel: RiskLevel;
  description: string;
  riskReason?: string;
  observations?: string[];
  annotations: CommunityAnnotation[];
  verificationStatus: VerificationStatus;
  dataOrigin: 'DEMO DATA — COMMUNITY CONTRIBUTED — UNVERIFIED' | 'COMMUNITY CONTRIBUTED — UNVERIFIED' | 'VERIFIED FIELD RECORD';
  createdBy: string;
  createdAt: string;
  syncStatus: 'synced_local' | 'pending_sync';
}

export interface FloodReport {
  id: string;
  category: ReportCategory;
  locationName: string;
  latitude: number;
  longitude: number;
  severity: RiskLevel;
  description: string;
  photoUrl?: string;
  status: VerificationStatus;
  dataOrigin: 'DEMO DATA — COMMUNITY CONTRIBUTED — UNVERIFIED' | 'COMMUNITY CONTRIBUTED — UNVERIFIED' | 'VERIFIED FIELD RECORD';
  reportedBy: string;
  createdAt: string;
  reviewedNote?: string;
  syncStatus: 'synced_local' | 'pending_sync';
}

export interface SafeShelter {
  id: string;
  name: string;
  locationName: string;
  latitude: number;
  longitude: number;
  capacity: number;
  currentOccupancyDemo: number;
  drinkingWater: boolean;
  toilets: boolean;
  wheelchairAccessible: boolean;
  accessibilityNotes: string;
  contactPhone: string;
  elevationMeters: number;
  photoUrl?: string;
  dataOrigin: 'DEMO DATA — COMMUNITY CONTRIBUTED — UNVERIFIED';
}

export interface EvacuationRouteResult {
  shelter: SafeShelter;
  originLatLng: [number, number];
  originLabel: string;
  pathLatLngs: [number, number][];
  distanceMeters: number;
  estimatedWalkMinutes: number;
  avoidedHazardsCount: number;
  instructions: string[];
}

export interface LayerVisibility {
  houses: boolean;
  streets: boolean;
  drains: boolean;
  waterlogging: boolean;
  floodZones: boolean;
  reports: boolean;
  shelters: boolean;
  evacuationRoute: boolean;
}

export type BasemapStyle = 'osm' | 'satellite';
