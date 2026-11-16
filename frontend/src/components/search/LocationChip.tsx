import React, { useState, useRef, useEffect } from 'react';
import { useLocationStore } from '../../store/useLocationStore';
import { useSearchStore } from '../../store/useSearchStore';
import { api } from '../../lib/api';
import styles from './LocationChip.module.css';

export const LocationChip: React.FC = () => {
  const { location, setLocation } = useLocationStore();
  const results = useSearchStore((state) => state.results);
  const setRoadMetrics = useSearchStore((state) => state.setRoadMetrics);
  const setMetricsLoading = useSearchStore((state) => state.setMetricsLoading);
  const metricsLoading = useSearchStore((state) => state.metricsLoading);
  const [isOpen, setIsOpen] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const updateLocationAndMetrics = async (
    nextLocation: typeof location,
  ): Promise<boolean> => {
    setLocation(nextLocation);
    const destinations = results.flatMap((result) =>
      result.type === 'offline' && result.offline
        ? [{
            id: result.id,
            lat: result.offline.lat,
            lng: result.offline.lng,
          }]
        : [],
    );
    if (!destinations.length) return true;

    setRoadMetrics([]);
    setMetricsLoading(true);
    setErrorMsg(null);
    try {
      const response = await api.metrics({
        origin: { lat: nextLocation.lat, lng: nextLocation.lng },
        destinations,
      });
      setRoadMetrics(response.metrics);
      return true;
    } catch (error) {
      setErrorMsg(
        error instanceof Error ? error.message : '도로 거리를 다시 계산하지 못했어요.',
      );
      return false;
    } finally {
      setMetricsLoading(false);
    }
  };

  // 외부 클릭 시 팝오버 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('이 브라우저에서는 위치 서비스를 지원하지 않습니다.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const updated = await updateLocationAndMetrics({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: '현재 위치',
          source: 'gps',
        });
        setIsLoading(false);
        if (updated) setIsOpen(false);
      },
      (err) => {
        setIsLoading(false);
        setErrorMsg('현재 위치를 가져오지 못했습니다. (' + err.message + ')');
      },
      { timeout: 8000 }
    );
  };

  const handleSetAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = addressInput.trim();
    if (!query) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.geocode({ address: query });
      const updated = await updateLocationAndMetrics({
        lat: res.lat,
        lng: res.lng,
        label: res.label,
        source: 'address',
      });
      if (!updated) return;
      setAddressInput('');
      setIsOpen(false);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : '주소를 찾지 못했어요.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container} ref={popoverRef} aria-busy={metricsLoading}>
      <button
        type="button"
        className={styles.chipButton}
        onClick={() => {
          setIsOpen(!isOpen);
          setErrorMsg(null);
        }}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span aria-hidden="true">📍</span> 내 위치: {location.label}
        <span className={styles.arrow} aria-hidden="true">
          ▾
        </span>
      </button>

      {metricsLoading && (
        <span className={styles.metricsStatus} role="status">
          도로 거리를 다시 계산하고 있어요.
        </span>
      )}

      {isOpen && (
        <div className={styles.popover} role="dialog" aria-label="위치 설정">
          <div className={styles.popoverHeader}>내 위치 설정</div>

          <button
            type="button"
            className={styles.gpsButton}
            onClick={handleUseCurrentLocation}
            disabled={isLoading}
          >
            {isLoading ? '확인 중…' : '📍 현재 위치 사용'}
          </button>

          <div className={styles.divider}>또는</div>

          <form onSubmit={handleSetAddress} className={styles.form}>
            <input
              type="text"
              className={styles.input}
              placeholder="동/읍/면 또는 주소 입력"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isLoading || !addressInput.trim()}
            >
              주소로 설정
            </button>
          </form>

          {errorMsg && <div className={styles.error}>{errorMsg}</div>}
        </div>
      )}
    </div>
  );
};
