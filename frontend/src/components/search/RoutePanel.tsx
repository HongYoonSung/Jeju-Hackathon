import React, { useState } from 'react';
import { LatLng, OfflinePlace } from '../../types/api';
import { useSearchStore } from '../../store/useSearchStore';
import { useLocationStore } from '../../store/useLocationStore';
import { api } from '../../lib/api';
import { formatDistance, formatDuration } from '../../lib/format';
import styles from './RoutePanel.module.css';

interface RoutePanelProps {
  destination: OfflinePlace;
}

export const RoutePanel: React.FC<RoutePanelProps> = ({ destination }) => {
  const { route, setRoute } = useSearchStore();
  const { location } = useLocationStore();

  const [originAddress, setOriginAddress] = useState('');
  const [originCoord, setOriginCoord] = useState<LatLng | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'driving' | 'transit'>('driving');
  const [transitResults, setTransitResults] = useState<any[]>([]);

  const isTransitFeatureEnabled =
    import.meta.env.VITE_FEATURE_TRANSIT === 'true';

  const handleUseMyLocation = () => {
    setOriginAddress(location.label);
    setOriginCoord({ lat: location.lat, lng: location.lng });
    setErrorMessage(null);
  };

  const handleCalculateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = originAddress.trim();
    if (!query) {
      setErrorMessage('출발 주소를 입력하세요.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      let startPoint = originCoord;

      // 주소가 직접 타이핑된 경우 지오코딩 수행
      if (!startPoint || originAddress !== location.label) {
        try {
          const geoRes = await api.geocode({ address: query });
          startPoint = { lat: geoRes.lat, lng: geoRes.lng };
          setOriginCoord(startPoint);
        } catch {
          setErrorMessage('주소를 찾지 못했어요. 더 자세히 입력해 주세요.');
          setIsLoading(false);
          return;
        }
      }

      const destPoint = { lat: destination.lat, lng: destination.lng };

      if (activeTab === 'driving') {
        const routeRes = await api.route({
          origin: startPoint,
          destination: destPoint,
          mode: 'driving',
        });
        setRoute(routeRes, startPoint);
      } else if (activeTab === 'transit') {
        const transitRes = await api.transit({
          origin: startPoint,
          destination: destPoint,
        });
        setTransitResults(transitRes.options);
      }
    } catch {
      setErrorMessage('경로를 계산하지 못했어요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.panel}>
      {/* P3: 자동차 / 대중교통 탭 */}
      <div className={styles.tabBar} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'driving'}
          className={`${styles.tabBtn} ${
            activeTab === 'driving' ? styles.activeTab : ''
          }`}
          onClick={() => setActiveTab('driving')}
        >
          자동차
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'transit'}
          disabled={!isTransitFeatureEnabled}
          title={!isTransitFeatureEnabled ? '준비 중' : ''}
          className={`${styles.tabBtn} ${
            activeTab === 'transit' ? styles.activeTab : ''
          }`}
          onClick={() => isTransitFeatureEnabled && setActiveTab('transit')}
        >
          대중교통 {!isTransitFeatureEnabled && '(준비 중)'}
        </button>
      </div>

      <form onSubmit={handleCalculateRoute} className={styles.form}>
        <div className={styles.inputRow}>
          <label htmlFor="origin-input" className={styles.label}>
            출발지
          </label>
          <div className={styles.inputWrapper}>
            <input
              id="origin-input"
              type="text"
              className={styles.input}
              placeholder="출발 주소를 입력하세요"
              value={originAddress}
              onChange={(e) => {
                setOriginAddress(e.target.value);
                setOriginCoord(null);
              }}
            />
            <button
              type="button"
              className={styles.myLocationLink}
              onClick={handleUseMyLocation}
            >
              내 위치로
            </button>
          </div>
        </div>

        <button
          type="submit"
          className={styles.routeBtn}
          disabled={isLoading || !originAddress.trim()}
        >
          {isLoading ? '계산 중…' : '길찾기'}
        </button>
      </form>

      {errorMessage && <div className={styles.error}>{errorMessage}</div>}

      {/* 자동차 경로 결과 (SPEC 5.3.6) */}
      {activeTab === 'driving' && route && (
        <div className={styles.resultBox}>
          <span className={styles.summaryText}>
            {route.provider === 'estimate' ? '추정 거리' : '도로 거리'}{' '}
            {formatDistance(route.distance_m)} · 자동차 약 {formatDuration(route.duration_s)}
          </span>
          {route.provider === 'estimate' && (
            <span className={styles.estimateTag}>직선 기반 추정값이에요.</span>
          )}
        </div>
      )}

      {/* 대중교통 결과 (P3) */}
      {activeTab === 'transit' && transitResults.length > 0 && (
        <div className={styles.transitResult}>
          {transitResults.map((opt, idx) => (
            <div key={idx} className={styles.transitOption}>
              <div className={styles.transitSummary}>
                총 {formatDuration(opt.total_duration_s)} (환승 {opt.transfers}회)
              </div>
              <div className={styles.transitSteps}>
                {opt.steps.map((st: any, sIdx: number) => (
                  <span key={sIdx} className={styles.transitStep}>
                    {sIdx > 0 && ' → '}
                    {st.label} ({formatDuration(st.duration_s)})
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
