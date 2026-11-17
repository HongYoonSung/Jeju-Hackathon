export type MapLoadFailure = 'script' | 'timeout' | 'auth';

export class MapLoadError extends Error {
  constructor(readonly reason: MapLoadFailure) {
    super(`Naver Maps failed to load: ${reason}`);
    this.name = 'MapLoadError';
  }
}

export interface NaverLatLng {
  lat(): number;
  lng(): number;
}

export interface NaverBounds {
  extend(position: NaverLatLng): void;
}

export interface NaverMarker {
  setMap(map: NaverMap | null): void;
}

export interface NaverMap {
  setCenter(position: NaverLatLng): void;
  setZoom(zoom: number): void;
  getZoom(): number;
  morph?(position: NaverLatLng, zoom: number): void;
  fitBounds(
    bounds: NaverBounds,
    padding: { top: number; right: number; bottom: number; left: number }
  ): void;
  autoResize?(): void;
  destroy?(): void;
}

export interface NaverMaps {
  maps: {
    Map: new (
      element: HTMLElement,
      options: {
        center: NaverLatLng;
        zoom: number;
        zoomControl: boolean;
        zoomControlOptions: { position: number };
      }
    ) => NaverMap;
    LatLng: new (lat: number, lng: number) => NaverLatLng;
    LatLngBounds: new () => NaverBounds;
    Size: new (width: number, height: number) => object;
    Point: new (x: number, y: number) => object;
    Marker: new (options: {
      position: NaverLatLng;
      map: NaverMap;
      zIndex: number;
      icon: { content: string; size: object; anchor: object };
    }) => NaverMarker;
    Polyline: new (options: {
      map: NaverMap;
      path: NaverLatLng[];
      strokeColor: string;
      strokeWeight: number;
      strokeOpacity: number;
      strokeLineCap: string;
      strokeLineJoin: string;
    }) => NaverMarker;
    InfoWindow: new (options: { content: HTMLElement }) => {
      open(map: NaverMap, marker: NaverMarker): void;
      close(): void;
    };
    Position: { TOP_RIGHT: number };
    Event: {
      addListener(target: object, eventName: string, handler: () => void): object;
      trigger(target: object, eventName: string): void;
    };
  };
}

declare global {
  interface Window {
    naver?: NaverMaps;
    navermap_authFailure?: () => void;
  }
}

let loadPromise: Promise<NaverMaps> | null = null;

export function loadNaverMaps(): Promise<NaverMaps> {
  if (window.naver?.maps) return Promise.resolve(window.naver);
  if (loadPromise) return loadPromise;

  const keyId = import.meta.env.VITE_NAVER_MAP_KEY_ID?.trim();
  if (!keyId) return Promise.reject(new MapLoadError('auth'));

  loadPromise = new Promise<NaverMaps>((resolve, reject) => {
    let settled = false;
    const script = document.createElement('script');
    const timeoutId = window.setTimeout(
      () => fail(new MapLoadError('timeout')),
      8000
    );

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      script.onerror = null;
      script.onload = null;
      window.navermap_authFailure = undefined;
    };
    const fail = (error: MapLoadError) => {
      if (settled) return;
      settled = true;
      cleanup();
      script.remove();
      loadPromise = null;
      reject(error);
    };

    window.navermap_authFailure = () => fail(new MapLoadError('auth'));
    script.async = true;
    const parameter =
      import.meta.env.VITE_NAVER_MAP_KEY_PARAM?.trim() || 'ncpKeyId';
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?${encodeURIComponent(parameter)}=${encodeURIComponent(keyId)}`;
    script.onload = () => {
      const naver = window.naver;
      if (!naver?.maps?.Map) {
        fail(new MapLoadError('script'));
        return;
      }
      if (settled) return;
      settled = true;
      cleanup();
      resolve(naver);
    };
    script.onerror = () => fail(new MapLoadError('script'));
    document.head.appendChild(script);
  });

  return loadPromise;
}
