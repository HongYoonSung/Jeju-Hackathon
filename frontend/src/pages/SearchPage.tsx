import React from 'react';
import { PageBanner } from '../components/layout/PageBanner';
import { SearchBar } from '../components/search/SearchBar';
import { ClassificationBar } from '../components/search/ClassificationBar';
import { ResultList } from '../components/search/ResultList';
import { MapCanvas } from '../components/map/MapCanvas';
import { useSearchStore } from '../store/useSearchStore';
import styles from './SearchPage.module.css';

export const SearchPage: React.FC = () => {
  const agentBriefing = useSearchStore((state) => state.agentBriefing);

  return (
    <div className={styles.searchPage}>
      {/* SearchBar 영역 (96px, 하늘색 배너 배경) */}
      <PageBanner>
        <SearchBar />
      </PageBanner>

      {/* 본문: 사이드바(380px) + 지도(남은 폭) */}
      <main className={styles.mainLayout}>
        <aside className={styles.sidebar} aria-label="검색 결과 사이드바">
          <ClassificationBar />
          {agentBriefing && (
            <p className={styles.agentBriefing} aria-label="AI 추천">
              {agentBriefing}
            </p>
          )}
          <ResultList />
        </aside>

        <section className={styles.mapArea} aria-label="지도 영역">
          <MapCanvas />
        </section>
      </main>
    </div>
  );
};
