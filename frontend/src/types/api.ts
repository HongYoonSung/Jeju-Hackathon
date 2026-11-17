export interface LatLng {
  lat: number;
  lng: number;
}

export interface PriceInfo {
  amount: number;
  unit_label: string;
  checked_at: string;
}

export interface OfflinePlace {
  address: string;
  lat: number;
  lng: number;
}

export interface OnlinePlace {
  site_name: string;
  deeplink_url: string;
}

export interface CrowdInfo {
  level: 'low' | 'medium' | 'high' | 'very_high';
  estimated_people: number;
  as_of: string;
  source: 'model' | 'mock';
}

export interface RoadMetric {
  distance_m: number;
  duration_s: number;
  source: 'osrm' | 'naver' | 'estimate';
}

export interface PlaceResult {
  id: string;
  type: 'offline' | 'online';
  rank: number;
  name: string;
  price?: PriceInfo | null;
  offline?: OfflinePlace | null;
  online?: OnlinePlace | null;
  road?: RoadMetric | null;
  crowd?: CrowdInfo | null;
}

export interface SearchRequest {
  query: string;
  user_location?: LatLng | null;
  client_time?: string | null;
}

export interface SearchResponse {
  request_id: string;
  query: string;
  generated_at: string;
  results: PlaceResult[];
  agent_briefing?: string | null;
}

export interface GeocodeRequest {
  address: string;
}

export interface GeocodeResponse {
  lat: number;
  lng: number;
  label: string;
  provider: string;
}

export interface RouteRequest {
  origin: LatLng;
  destination: LatLng;
  mode?: string;
}

export interface RouteResponse {
  distance_m: number;
  duration_s: number;
  geometry: [number, number][]; // [[lat, lng], ...]
  provider: 'estimate' | 'osrm' | 'naver';
}

export interface MetricsRequest {
  origin: LatLng;
  destinations: Array<LatLng & { id: string }>;
}

export interface MetricResult extends RoadMetric {
  id: string;
}

export interface MetricsResponse {
  metrics: MetricResult[];
}

export interface AuthUser {
  id: string;
}

export interface TransitStep {
  mode: 'walk' | 'bus';
  label: string;
  duration_s: number;
}

export interface TransitOption {
  total_duration_s: number;
  transfers: number;
  steps: TransitStep[];
}

export interface TransitRequest {
  origin: LatLng;
  destination: LatLng;
  depart_at?: string | null;
}

export interface TransitResponse {
  options: TransitOption[];
  provider: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export type PlaceWithDistance = PlaceResult;
