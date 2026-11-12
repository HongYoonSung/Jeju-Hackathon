import React from 'react';
import { useSearchStore } from '../../store/useSearchStore';
import styles from './ClassificationBar.module.css';

export const ClassificationBar: React.FC = () => {
  const { results, sortKey, typeFilter, setSortKey, setTypeFilter } =
    useSearchStore();

  const totalCount = results.length;
  const offlineCount = results.filter((r) => r.type === 'offline').length;
  const onlineCount = results.filter((r) => r.type === 'online').length;

  return (
    <div className={styles.bar}>
      {/* 1줄: 정렬 세그먼트 버튼 */}
      <div className={styles.sortRow} role="tablist" aria-label="정렬 기준">
        <button
          type="button"
          role="tab"
          aria-selected={sortKey === 'recommend'}
          className={`${styles.sortBtn} ${
            sortKey === 'recommend' ? styles.activeSort : ''
          }`}
          onClick={() => setSortKey('recommend')}
        >
          추천순
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={sortKey === 'distance'}
          className={`${styles.sortBtn} ${
            sortKey === 'distance' ? styles.activeSort : ''
          }`}
          onClick={() => setSortKey('distance')}
        >
          거리순
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={sortKey === 'price'}
          className={`${styles.sortBtn} ${
            sortKey === 'price' ? styles.activeSort : ''
          }`}
          onClick={() => setSortKey('price')}
        >
          가격순
        </button>
      </div>

      {/* 2줄: 유형 필터 칩 */}
      <div className={styles.filterRow} role="group" aria-label="유형 필터">
        <button
          type="button"
          aria-pressed={typeFilter === 'all'}
          className={`${styles.filterChip} ${
            typeFilter === 'all' ? styles.activeFilter : ''
          }`}
          onClick={() => setTypeFilter('all')}
        >
          전체 ({totalCount})
        </button>
        <button
          type="button"
          aria-pressed={typeFilter === 'offline'}
          className={`${styles.filterChip} ${
            typeFilter === 'offline' ? styles.activeFilter : ''
          }`}
          onClick={() => setTypeFilter('offline')}
        >
          오프라인 ({offlineCount})
        </button>
        <button
          type="button"
          aria-pressed={typeFilter === 'online'}
          className={`${styles.filterChip} ${
            typeFilter === 'online' ? styles.activeFilter : ''
          }`}
          onClick={() => setTypeFilter('online')}
        >
          온라인 ({onlineCount})
        </button>
      </div>
    </div>
  );
};
