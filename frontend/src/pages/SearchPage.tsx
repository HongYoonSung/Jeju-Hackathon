import React from 'react';
import { PageBanner } from '../components/layout/PageBanner';
import { SearchBar } from '../components/search/SearchBar';
import { ClassificationBar } from '../components/search/ClassificationBar';
import { ResultList } from '../components/search/ResultList';
import { MapCanvas } from '../components/map/MapCanvas';
import { useSearchStore } from '../store/useSearchStore';
import { formatPrice } from '../lib/format';
import styles from './SearchPage.module.css';

function renderBriefingLine(line: string, idx: number) {
  const cleaned = line.replace(/^\s*[-*•]\s+/, '• ').trim();
  if (!cleaned) return null;
  const parts = cleaned.split(/\*\*(.+?)\*\*/g);
  return (
    <p key={idx} className={styles.briefingLine}>
      {parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i}>{part}</strong> : part.replace(/\*/g, '')
      )}
    </p>
  );
}

export const SearchPage: React.FC = () => {
  const agentBriefing = useSearchStore((state) => state.agentBriefing);
  const comparison = useSearchStore((state) => state.comparison);

  const options = comparison?.options ?? [];
  const minTotalPrice =
    options.length > 0 ? Math.min(...options.map((opt) => opt.total_price)) : null;

  const hasBottomPanel = Boolean(agentBriefing) || options.length > 0;

  return (
    <div className={styles.searchPage}>
      {/* SearchBar 영역 (96px, 하늘색 배너 배경) */}
      <PageBanner>
        <SearchBar />
      </PageBanner>

      {/* 본문: 사이드바(좌) + 지도/최종결과(우) */}
      <main className={styles.mainLayout}>
        <aside className={styles.sidebar} aria-label="검색 결과 사이드바">
          <ClassificationBar />
          <ResultList />
        </aside>

        <div className={styles.rightColumn}>
          <section className={styles.mapArea} aria-label="지도 영역">
            <MapCanvas />
          </section>

          {hasBottomPanel && (
            <section className={styles.bottomResultPanel} aria-label="최종 비교 결과">
              <div className={styles.panelHeader}>
                <div className={styles.panelTitleGroup}>
                  <h2 className={styles.panelTitle}>최종 종합 비교</h2>
                  {comparison?.max_savings != null && comparison.max_savings > 0 && (
                    <span className={styles.savingsBadge}>
                      최대 {formatPrice(comparison.max_savings)} 절약
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.panelContent}>
                {options.length > 0 && (
                  <div className={styles.summaryGrid}>
                    {options.map((opt) => {
                      const isBest =
                        minTotalPrice !== null && opt.total_price === minTotalPrice;
                      return (
                        <div
                          key={`${opt.label}-${opt.name}`}
                          className={`${styles.summaryCard} ${isBest ? styles.summaryCardBest : ''}`}
                        >
                          <div className={styles.summaryCardTop}>
                            <span className={styles.optionLabel}>{opt.label}</span>
                            {isBest && <span className={styles.bestTag}>최저가</span>}
                          </div>
                          <div className={styles.optionName}>{opt.name}</div>
                          <div className={styles.optionPrice}>
                            {formatPrice(opt.total_price)}
                          </div>
                          {opt.badge && (
                            <div className={styles.optionBadge}>{opt.badge}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {agentBriefing && (
                  <div className={styles.briefingBox} aria-label="AI 추천 요약">
                    {agentBriefing.split('\n').map(renderBriefingLine)}
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
};
