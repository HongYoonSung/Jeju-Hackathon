import React, { useEffect, useState } from 'react';
import { loadNaverMaps } from '../../lib/loadNaverMaps';
import { LeafletMapCanvas } from './LeafletMapCanvas';
import { NaverMapCanvas } from './NaverMapCanvas';
import styles from './MapCanvas.module.css';

type MapMode = 'loading' | 'naver' | 'leaflet' | 'error';

const configuredProvider = import.meta.env.VITE_MAP_PROVIDER || 'naver';
const configuredFallback = import.meta.env.VITE_MAP_FALLBACK || 'leaflet';

export const MapCanvas: React.FC = () => {
  const [mode, setMode] = useState<MapMode>(
    configuredProvider === 'leaflet' ? 'leaflet' : 'loading'
  );

  useEffect(() => {
    if (configuredProvider === 'leaflet') {
      setMode('leaflet');
      return;
    }
    if (configuredProvider !== 'naver') {
      setMode('error');
      return;
    }

    let active = true;
    void loadNaverMaps()
      .then(() => {
        if (active) setMode('naver');
      })
      .catch(() => {
        if (active) setMode(configuredFallback === 'leaflet' ? 'leaflet' : 'error');
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className={styles.mapContainer} role="region" aria-label="지도">
      {mode === 'naver' && <NaverMapCanvas />}
      {mode === 'leaflet' && <LeafletMapCanvas />}
      {mode === 'loading' && (
        <div className={styles.mapMessage} role="status">
          지도를 불러오는 중입니다…
        </div>
      )}
      {mode === 'error' && (
        <div className={styles.mapMessage} role="alert">
          지도를 불러오지 못했어요.
        </div>
      )}
      {mode === 'leaflet' && configuredProvider === 'naver' && (
        <div className={styles.mapNotice} role="status">
          네이버 지도를 불러오지 못해 기본 지도로 보여드려요.
        </div>
      )}
    </div>
  );
};
