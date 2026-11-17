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

interface MapControllerProps {
  markerRefs: React.MutableRefObject<{ [key: string]: L.Marker }>;
}

const MapController: React.FC<MapControllerProps> = ({ markerRefs }) => {
  const map = useMap();
  const { results, selectedId, route } = useSearchStore();
  const { location } = useLocationStore();

  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);

  useEffect(() => {
    const offlineItems = results.filter(
      (result) => result.type === 'offline' && result.offline
    );
    if (offlineItems.length === 0) return;

    const bounds = L.latLngBounds([]);
    offlineItems.forEach((item) => {
      if (item.offline) bounds.extend([item.offline.lat, item.offline.lng]);
    });
    if (location) bounds.extend([location.lat, location.lng]);
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [results, location, map]);

  useEffect(() => {
    if (!selectedId) return;
    const selectedItem = results.find((result) => result.id === selectedId);
    if (!selectedItem?.offline) return;

    const { lat, lng } = selectedItem.offline;
    map.flyTo([lat, lng], 16, { duration: 0.6 });
    markerRefs.current[selectedId]?.openPopup();
  }, [selectedId, results, map]);

  useEffect(() => {
    if (route?.geometry.length) {
      map.fitBounds(L.latLngBounds(route.geometry), {
        padding: [50, 50],
        maxZoom: 16,
      });
    }
  }, [route, map]);

  return null;
};

export const LeafletMapCanvas: React.FC = () => {
  const { getVisibleResults, selectedId, setSelectedId, route, routeOrigin } =
    useSearchStore();
  const { location } = useLocationStore();
  const offlinePlaces = getVisibleResults().filter(
    (result) => result.type === 'offline' && result.offline
  );
  const tileUrl =
    import.meta.env.VITE_TILE_URL ||
    'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  const markerRefs = useRef<{ [key: string]: L.Marker }>({});

  return (
    <MapContainer
      center={[33.38, 126.55]}
      zoom={10}
      scrollWheelZoom
      className={styles.leafletMap}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url={tileUrl}
      />
      <MapController markerRefs={markerRefs} />

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

      {offlinePlaces.map((place, index) => {
        if (!place.offline) return null;
        return (
          <Marker
            key={place.id}
            ref={(marker) => {
              if (marker) markerRefs.current[place.id] = marker;
              else delete markerRefs.current[place.id];
            }}
            position={[place.offline.lat, place.offline.lng]}
            icon={createStoreMarkerIcon(
              index + 1,
              place.crowd,
              selectedId === place.id
            )}
            eventHandlers={{ click: () => setSelectedId(place.id) }}
          >
            <Popup>
              <strong>{place.name}</strong>
              <br />
              {place.offline.address}
            </Popup>
          </Marker>
        );
      })}

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

      {route?.geometry.length ? (
        <Polyline
          positions={route.geometry}
          pathOptions={{
            color: '#234F9F',
            weight: 5,
            opacity: 0.85,
          }}
        />
      ) : null}
    </MapContainer>
  );
};
