import React, { useState } from 'react';
import { useSearchStore } from '../../store/useSearchStore';
import { useLocationStore } from '../../store/useLocationStore';
import { api } from '../../lib/api';
import { LocationChip } from './LocationChip';
import styles from './SearchBar.module.css';

export const SearchBar: React.FC = () => {
  const { status, errorMessage, setStatus, setErrorMessage, setResults } =
    useSearchStore();
  const { location } = useLocationStore();
  const [inputVal, setInputVal] = useState('');

  const isLoading = status === 'loading';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = inputVal.trim();
    if (!query) {
      return;
    }

    setStatus('loading');
    setErrorMessage(null);

    try {
      const res = await api.search({
        query,
        user_location: { lat: location.lat, lng: location.lng },
        client_time: new Date().toISOString(),
      });
      setResults(res.results);
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || '검색 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className={styles.searchBarContainer}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputWrapper}>
          <input
            type="text"
            className={styles.input}
            placeholder="찾고 싶은 상품을 말해 주세요 (예: 우유 1L 제일 싼 곳)"
            maxLength={200}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            disabled={isLoading}
            aria-label="상품 검색어"
          />
          <button
            type="submit"
            className={styles.searchButton}
            disabled={isLoading || !inputVal.trim()}
          >
            {isLoading ? '검색 중…' : '검색'}
          </button>
        </div>

        <div className={styles.locationWrapper}>
          <LocationChip />
        </div>
      </form>

      {/* 에러 한 줄 메시지 (SPEC 7.7) */}
      {errorMessage && (
        <div className={styles.errorBanner} role="alert">
          {errorMessage}
        </div>
      )}
    </div>
  );
};
