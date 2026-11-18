import React from 'react';
import { useSearchStore } from '../../store/useSearchStore';
import styles from './ClassificationBar.module.css';

export const ClassificationBar: React.FC = () => {
  const {
    results,
    comparison,
    selectedIngredient,
    sortKey,
    typeFilter,
    setSelectedIngredient,
    setSortKey,
    setTypeFilter,
  } = useSearchStore();

  const ingredients = comparison?.ingredients ?? [];
  const scopedResults = selectedIngredient
    ? results.filter((r) =>
        r.type === 'online'
          ? r.matched_query === selectedIngredient
          : Boolean(r.item_prices && selectedIngredient in r.item_prices),
      )
    : results;

  const totalCount = scopedResults.length;
  const offlineCount = scopedResults.filter((r) => r.type === 'offline').length;
  const onlineCount = scopedResults.filter((r) => r.type === 'online').length;

  return (
    <div className={styles.bar}>
      {/* 0줄: 재료 선택 칩 */}
      {ingredients.length > 0 && (
        <div className={styles.ingredientRow} role="group" aria-label="재료 선택">
          <button
            type="button"
            aria-pressed={selectedIngredient === null}
            className={`${styles.ingredientChip} ${
              selectedIngredient === null ? styles.activeIngredient : ''
            }`}
            onClick={() => setSelectedIngredient(null)}
          >
            전체 (장바구니)
          </button>
          {ingredients.map((ingredient) => (
            <button
              key={ingredient}
              type="button"
              aria-pressed={selectedIngredient === ingredient}
              className={`${styles.ingredientChip} ${
                selectedIngredient === ingredient ? styles.activeIngredient : ''
              }`}
              onClick={() => setSelectedIngredient(ingredient)}
            >
              {ingredient}
            </button>
          ))}
        </div>
      )}

      {/* 1줄: 정렬 세그먼트 버튼 */}
      <div className={styles.sortRow} role="tablist" aria-label="정렬 기준">
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
