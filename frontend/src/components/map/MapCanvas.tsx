import React, { useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { useSearchStore } from '../../store/useSearchStore';
import { useLocationStore } from '../../store/useLocationStore';
import {
  createStoreMarkerIcon,
  createUserLocationIcon,
  createOriginMarkerIcon,
} from './markerIcon';
import styles from './MapCanvas.module.css';

// 지도 컨트롤러: flyTo, fitBounds, invalidateSize 관리
const MapController: React.FC = () => {
  const map = useMap();
  const { results, selectedId, route } = useSearchStore();
  const { location } = useLocationStore();
  const markerRefs = useRef<{ [key: string]: L.Marker }>({});

  // 1. ResizeObserver로 invalidateSize 호출 (SPEC 5.3.7)
  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  // 2. 검색 결과 변경 시 자동 fitBounds (SPEC 5.3.7)
  useEffect(() => {
    const offlineItems = results.filter(
      (r) => r.type === 'offline' && r.offline
    );
    if (offlineItems.length === 0) return;

    const bounds = L.latLngBounds([]);
    offlineItems.forEach((item) => {
      if (item.offline) {
        bounds.extend([item.offline.lat, item.offline.lng]);
      }
    });

    if (location) {
      bounds.extend([location.lat, location.lng]);
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [results, location, map]);

  // 3. 카드 클릭으로 selectedId 변경 시 flyTo 및 팝업 (SPEC 5.3.4, 5.3.7)
  useEffect(() => {
    if (!selectedId) return;
    const selectedItem = results.find((r) => r.id === selectedId);
    if (selectedItem && selectedItem.offline) {
      const { lat, lng } = selectedItem.offline;
      map.flyTo([lat, lng], 16, { duration: 0.6 });

      const marker = markerRefs.current[selectedId];
      if (marker) {
        marker.openPopup();
      }
    }
  }, [selectedId, results, map]);

  // 4. 경로선 생성 시 fitBounds (SPEC 5.3.6)
  useEffect(() => {
    if (route && route.geometry && route.geometry.length > 0) {
      const bounds = L.latLngBounds(route.geometry);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [route, map]);

  return null;
};

export const MapCanvas: React.FC = () => {
  const { getVisibleResults, selectedId, setSelectedId, route, routeOrigin } =
    useSearchStore();
  const { location } = useLocationStore();

  const visibleResults = getVisibleResults(location);
  const offlinePlaces = visibleResults.filter(
    (r) => r.type === 'offline' && r.offline
  );

  const tileUrl =
    import.meta.env.VITE_TILE_URL ||
    'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

  return (
    <div className={styles.mapContainer} role="region" aria-label="지도">
      <MapContainer
        center={[33.38, 126.55]}
        zoom={10}
        scrollWheelZoom={true}
        className={styles.leafletMap}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={tileUrl}
        />

        <MapController />

        {/* 1. 사용자 위치 마커 */}
        {location && (
          <Marker
            position={[location.lat, location.lng]}
            icon={createUserLocationIcon()}
          >
            <Popup>
              <strong>{location.label}</strong>
              <br />
              현재 설정된 기준 위치
            </Popup>
          </Marker>
        )}

        {/* 2. 오프라인 매장 마커들 */}
        {offlinePlaces.map((place, idx) => {
          if (!place.offline) return null;
          const isSelected = selectedId === place.id;
          const icon = createStoreMarkerIcon(idx + 1, place.crowd, isSelected);

          return (
            <Marker
              key={place.id}
              position={[place.offline.lat, place.offline.lng]}
              icon={icon}
              eventHandlers={{
                click: () => {
                  setSelectedId(place.id);
                },
              }}
            >
              <Popup>
                <strong>{place.name}</strong>
                <br />
                {place.offline.address}
              </Popup>
            </Marker>
          );
        })}

        {/* 3. 길찾기 출발지 마커 (SPEC 5.3.6) */}
        {route && routeOrigin && (
          <Marker
            position={[routeOrigin.lat, routeOrigin.lng]}
            icon={createOriginMarkerIcon()}
          >
            <Popup>
              <strong>출발지</strong>
            </Popup>
          </Marker>
        )}

        {/* 4. 길찾기 경로선 폴리라인 (SPEC 5.3.6) */}
        {route && route.geometry && (
          <Polyline
            positions={route.geometry}
            pathOptions={{
              color: '#234F9F',
              weight: 5,
              opacity: 0.85,
            }}
          />
        )}
      </MapContainer>
    </div>
  );
};
