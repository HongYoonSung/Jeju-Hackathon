import React, { useEffect, useRef, useState } from 'react';
import { useSearchStore } from '../../store/useSearchStore';
import { useLocationStore } from '../../store/useLocationStore';
import {
  loadNaverMaps,
  NaverMap,
  NaverMaps,
  NaverMarker,
} from '../../lib/loadNaverMaps';
import styles from './MapCanvas.module.css';

const crowdColors: Record<string, string> = {
  low: '#2E9E5B',
  medium: '#F2C200',
  high: '#F28A1B',
  very_high: '#E5352B',
};

function markerContent(order: number, color: string, selected: boolean): string {
  const size = selected ? 36 : 28;
  return `<div style="width:${size}px;height:${size}px;background:${color};color:#fff;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font:700 12px Pretendard,sans-serif">${order}</div>`;
}

function createMarker(
  api: NaverMaps,
  map: NaverMap,
  position: InstanceType<NaverMaps['maps']['LatLng']>,
  content: string,
  zIndex: number,
  iconSize = 36
): NaverMarker {
  return new api.maps.Marker({
    position,
    map,
    zIndex,
    icon: {
      content,
      size: new api.maps.Size(iconSize, iconSize),
      anchor: new api.maps.Point(iconSize / 2, iconSize / 2),
    },
  });
}

export const NaverMapCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<NaverMap | null>(null);
  const apiRef = useRef<NaverMaps | null>(null);
  const markersRef = useRef<Map<string, NaverMarker>>(new Map());
  const routeOverlaysRef = useRef<NaverMarker[]>([]);
  const infoWindowRef = useRef<InstanceType<NaverMaps['maps']['InfoWindow']> | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const { getVisibleResults, selectedId, setSelectedId, route, routeOrigin } =
    useSearchStore();
  const { location } = useLocationStore();
  const places = getVisibleResults().filter(
    (result) => result.type === 'offline' && result.offline
  );

  useEffect(() => {
    let disposed = false;
    void loadNaverMaps().then((api) => {
      if (disposed || !containerRef.current) return;
      apiRef.current = api;
      mapRef.current = new api.maps.Map(containerRef.current, {
        center: new api.maps.LatLng(33.38, 126.55),
        zoom: 10,
        zoomControl: true,
        zoomControlOptions: { position: api.maps.Position.TOP_RIGHT },
      });
      setMapReady(true);
    });

    return () => {
      disposed = true;
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current.clear();
      routeOverlaysRef.current.forEach((overlay) => overlay.setMap(null));
      routeOverlaysRef.current = [];
      infoWindowRef.current?.close();
      mapRef.current?.destroy?.();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const api = apiRef.current;
    if (!api) return;

    const observer = new ResizeObserver(() => {
      if (map.autoResize) map.autoResize();
      else api.maps.Event.trigger(map, 'resize');
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const api = apiRef.current;
    if (!mapReady || !map || !api) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current.clear();

    places.forEach((place, index) => {
      if (!place.offline) return;
      const selected = place.id === selectedId;
      const color = place.crowd
        ? crowdColors[place.crowd.level] || '#234F9F'
        : '#234F9F';
      const marker = createMarker(
        api,
        map,
        new api.maps.LatLng(place.offline.lat, place.offline.lng),
        markerContent(index + 1, color, selected),
        selected ? 100 : 1,
        selected ? 36 : 28
      );
      api.maps.Event.addListener(marker, 'click', () => setSelectedId(place.id));
      markersRef.current.set(place.id, marker);
    });
  }, [mapReady, places, selectedId, setSelectedId]);

  useEffect(() => {
    const map = mapRef.current;
    const api = apiRef.current;
    if (!mapReady || !map || !api) return;

    const bounds = new api.maps.LatLngBounds();
    let pointCount = 0;
    places.forEach((place) => {
      if (!place.offline) return;
      bounds.extend(new api.maps.LatLng(place.offline.lat, place.offline.lng));
      pointCount += 1;
    });
    if (location) {
      bounds.extend(new api.maps.LatLng(location.lat, location.lng));
      pointCount += 1;
    }
    if (pointCount > 0) {
      map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
      if (map.getZoom() > 15) map.setZoom(15);
    }
  }, [mapReady, places, location]);

  useEffect(() => {
    const map = mapRef.current;
    const api = apiRef.current;
    if (!mapReady || !map || !api || !selectedId) return;
    const selected = places.find((place) => place.id === selectedId);
    const marker = markersRef.current.get(selectedId);
    if (!selected?.offline || !marker) return;

    const position = new api.maps.LatLng(
      selected.offline.lat,
      selected.offline.lng
    );
    if (map.morph) map.morph(position, 16);
    else {
      map.setCenter(position);
      map.setZoom(16);
    }
    infoWindowRef.current?.close();
    const content = document.createElement('div');
    content.textContent = selected.name;
    infoWindowRef.current = new api.maps.InfoWindow({ content });
    infoWindowRef.current.open(map, marker);
  }, [mapReady, places, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    const api = apiRef.current;
    if (!mapReady || !map || !api) return;

    routeOverlaysRef.current.forEach((overlay) => overlay.setMap(null));
    routeOverlaysRef.current = [];
    if (!route?.geometry.length) return;

    const path = route.geometry.map(
      ([lat, lng]) => new api.maps.LatLng(lat, lng)
    );
    routeOverlaysRef.current = [
      new api.maps.Polyline({
        map,
        path,
        strokeColor: '#ffffff',
        strokeWeight: 9,
        strokeOpacity: 1,
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
      }),
      new api.maps.Polyline({
        map,
        path,
        strokeColor: '#234F9F',
        strokeWeight: 6,
        strokeOpacity: 0.9,
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
      }),
    ];
    const bounds = new api.maps.LatLngBounds();
    path.forEach((point) => bounds.extend(point));
    map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
  }, [mapReady, route]);

  useEffect(() => {
    const map = mapRef.current;
    const api = apiRef.current;
    if (!mapReady || !map || !api || !location) return;
    const marker = createMarker(
      api,
      map,
      new api.maps.LatLng(location.lat, location.lng),
      '<div style="width:32px;height:32px;border-radius:50%;background:rgba(35,79,159,.25);display:flex;align-items:center;justify-content:center"><span style="width:14px;height:14px;border:2px solid #fff;border-radius:50%;background:#234F9F"></span></div>',
      200,
      32
    );
    return () => marker.setMap(null);
  }, [mapReady, location]);

  useEffect(() => {
    const map = mapRef.current;
    const api = apiRef.current;
    if (!mapReady || !map || !api || !route || !routeOrigin) return;
    const marker = createMarker(
      api,
      map,
      new api.maps.LatLng(routeOrigin.lat, routeOrigin.lng),
      '<div style="padding:4px 8px;background:#234F9F;color:#fff;border:2px solid #fff;border-radius:12px;font:700 11px Pretendard,sans-serif;white-space:nowrap">출발</div>',
      300,
      40
    );
    return () => marker.setMap(null);
  }, [mapReady, route, routeOrigin]);

  return <div ref={containerRef} className={styles.naverMap} />;
};
