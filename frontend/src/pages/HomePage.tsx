import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useLocationStore } from '../store/useLocationStore';
import { useSearchStore } from '../store/useSearchStore';
import styles from './HomePage.module.css';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocationStore((state) => state.location);
  const hasRequestedGps = useLocationStore((state) => state.hasRequestedGps);
  const setLocation = useLocationStore((state) => state.setLocation);
  const markGpsRequested = useLocationStore((state) => state.markGpsRequested);
  const setQuery = useSearchStore((state) => state.setQuery);
  const setStatus = useSearchStore((state) => state.setStatus);
  const setErrorMessage = useSearchStore((state) => state.setErrorMessage);
  const setSearchResponse = useSearchStore((state) => state.setSearchResponse);
  const [query, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setLocalErrorMessage] = useState<string | null>(null);

  const requestLocationOnce = async () => {
    if (hasRequestedGps) return location;
    markGpsRequested();

    if (!navigator.geolocation) return location;

    const currentLocation = await new Promise<GeolocationPosition | null>(
      (resolve) => {
        const timeoutId = window.setTimeout(() => resolve(null), 5000);
        navigator.geolocation.getCurrentPosition(
          (position) => {
            window.clearTimeout(timeoutId);
            resolve(position);
          },
          () => {
            window.clearTimeout(timeoutId);
            resolve(null);
          },
          { timeout: 5000, maximumAge: 0 },
        );
      },
    );

    if (!currentLocation) return location;
    const selectedLocation = {
      lat: currentLocation.coords.latitude,
      lng: currentLocation.coords.longitude,
      label: '현재 위치',
      source: 'gps' as const,
    };
    setLocation(selectedLocation);
    return selectedLocation;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedQuery = query.trim();
    if (!normalizedQuery || isLoading) return;

    setIsLoading(true);
    setLocalErrorMessage(null);
    setQuery(normalizedQuery);
    setStatus('loading');
    setErrorMessage(null);

    try {
      const searchLocation = await requestLocationOnce();
      const response = await api.search({
        query: normalizedQuery,
        user_location: { lat: searchLocation.lat, lng: searchLocation.lng },
        client_time: new Date().toISOString(),
      });
      setSearchResponse(response);
      navigate('/search');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '검색 중 오류가 발생했어요.';
      setLocalErrorMessage(message);
      setStatus('error');
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className={styles.main}>
      <section className={styles.content} aria-labelledby="home-title">
        <h1 id="home-title" className={styles.title}>
          오늘 제주 가격,
          <br />
          뭐가 궁금하세요?
        </h1>
        <form className={styles.searchForm} onSubmit={handleSubmit}>
          <label className={styles.visuallyHidden} htmlFor="home-search">
            찾고 싶은 상품과 위치를 입력해 주세요
          </label>
          <div className={styles.inputShell}>
            <textarea
              id="home-search"
              className={styles.input}
              rows={1}
              maxLength={200}
              autoFocus
              placeholder="예) 노형동 근처에서 우유 제일 싼 곳 알려줘"
              value={query}
              readOnly={isLoading}
              onChange={(event) => {
                setInputQuery(event.target.value);
                event.target.style.height = 'auto';
                event.target.style.height = `${Math.min(event.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={(event) => {
                if (
                  event.key === 'Enter' &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isLoading || !query.trim()}
              aria-label="검색"
            >
              {isLoading ? (
                <span className={styles.spinner} aria-hidden="true" />
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 19V5m-6 6 6-6 6 6" />
                </svg>
              )}
            </button>
          </div>
          {isLoading && (
            <p className={styles.loadingText} role="status">
              찾아보고 있어요
            </p>
          )}
          {errorMessage && (
            <p className={styles.errorText} role="alert">
              {errorMessage}
            </p>
          )}
        </form>
      </section>
    </main>
  );
};
