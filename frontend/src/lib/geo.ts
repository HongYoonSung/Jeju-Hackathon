import { LatLng } from '../types/api';

/**
 * 두 좌표 간의 직선거리(m)를 계산합니다.
 */
export function haversine(a: LatLng, b: LatLng): number {
  const earthRadiusM = 6371000;
  const lat1Rad = (a.lat * Math.PI) / 180;
  const lat2Rad = (b.lat * Math.PI) / 180;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;

  const sinDLat2 = Math.sin(dLat / 2);
  const sinDLng2 = Math.sin(dLng / 2);

  const calc =
    sinDLat2 * sinDLat2 +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * sinDLng2 * sinDLng2;

  const c = 2 * Math.atan2(Math.sqrt(calc), Math.sqrt(1 - calc));
  return earthRadiusM * c;
}
