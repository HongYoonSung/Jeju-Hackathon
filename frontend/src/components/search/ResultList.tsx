import React from 'react';
import { useSearchStore } from '../../store/useSearchStore';
import { useLocationStore } from '../../store/useLocationStore';
import { ResultCard } from './ResultCard';
import styles from './ResultList.module.css';

export const ResultList: React.FC = () => {
  const { status, getVisibleResults } = useSearchStore();
  const { location } = useLocationStore();

  const visibleResults = getVisibleResults(location);

  if (status === 'idle') {
    return (
      <div className={styles.emptyContainer}>
        <p className={styles.message}>찾고 싶은 상품을 검색해 보세요.</p>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className={styles.emptyContainer}>
        <p className={styles.message}>검색 결과를 찾는 중입니다…</p>
      </div>
    );
  }

  if (visibleResults.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <p className={styles.message}>검색 결과가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className={styles.list} role="feed" aria-label="검색 결과 목록">
      {visibleResults.map((place, idx) => (
        <ResultCard
          key={place.id}
          place={place}
          displayIndex={idx + 1}
        />
      ))}
    </div>
  );
};
