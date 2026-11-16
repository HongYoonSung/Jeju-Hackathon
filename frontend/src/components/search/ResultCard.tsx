import React, { useState } from 'react';
import { PlaceWithDistance } from '../../types/api';
import { useSearchStore } from '../../store/useSearchStore';
import { TypeBadge } from './TypeBadge';
import { CrowdBadge } from './CrowdBadge';
import { RoutePanel } from './RoutePanel';
import { formatDistance, formatDuration, formatPrice } from '../../lib/format';
import { safeUrl } from '../../lib/safeUrl';
import styles from './ResultCard.module.css';

interface ResultCardProps {
  place: PlaceWithDistance;
  displayIndex: number;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  place,
  displayIndex,
}) => {
  const { selectedId, setSelectedId } = useSearchStore();
  const [isRouteOpen, setIsRouteOpen] = useState(false);

  const isSelected = selectedId === place.id;
  const isOffline = place.type === 'offline';

  const handleClick = () => {
    if (isOffline) {
      if (isSelected) {
        // 이미 선택된 상태에서 다시 클릭
      } else {
        setSelectedId(place.id);
        setIsRouteOpen(false);
      }
    } else if (place.online) {
      const validUrl = safeUrl(place.online.deeplink_url);
      if (validUrl) {
        window.open(validUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const handleToggleRoute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRouteOpen(!isRouteOpen);
  };

  return (
    <article
      className={`${styles.card} ${isSelected ? styles.selected : ''}`}
      onClick={handleClick}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`${place.name} 상세 정보 보기`}
    >
      <div className={styles.headerRow}>
        <div className={styles.nameGroup}>
          <span className={styles.indexCircle}>{displayIndex}</span>
          <h3 className={styles.placeName}>{place.name}</h3>
          {!isOffline && (
            <span className={styles.externalIcon} aria-label="새 창 열림">
              ↗
            </span>
          )}
        </div>
        {isOffline && <CrowdBadge crowd={place.crowd} />}
      </div>

      <div className={styles.metaRow}>
        <TypeBadge type={place.type} />
        {isOffline && place.offline && (
          <span className={styles.metaText}>
            {place.offline.address}
            {place.road && (
              <>
                {' · '}
                {place.road.source === 'estimate' && '약 '}
                {formatDistance(place.road.distance_m)}
                {' · '}
                {place.road.source === 'estimate' && '약 '}
                {formatDuration(place.road.duration_s)}
                {place.road.source === 'estimate' && ' (추정)'}
              </>
            )}
          </span>
        )}
        {!isOffline && place.online && (
          <span className={styles.metaText}>{place.online.site_name}</span>
        )}
      </div>

      <div className={styles.priceRow}>
        {place.price ? (
          <div className={styles.priceText}>
            <span className={styles.amount}>{formatPrice(place.price.amount)}</span>
            {place.price.unit_label && (
              <span className={styles.unit}> / {place.price.unit_label}</span>
            )}
          </div>
        ) : (
          <span className={styles.noPrice}>가격 정보 없음</span>
        )}
      </div>

      {/* 오프라인이고 선택된 카드에만 길찾기 버튼 표시 (SPEC 5.3.4) */}
      {isOffline && isSelected && (
        <div className={styles.actionsRow}>
          <button
            type="button"
            className={styles.routeButton}
            onClick={handleToggleRoute}
          >
            {isRouteOpen ? '길찾기 닫기' : '길찾기'}
          </button>
        </div>
      )}

      {/* 길찾기 패널 아코디언 (SPEC 5.3.6) */}
      {isOffline && isSelected && isRouteOpen && place.offline && (
        <RoutePanel destination={place.offline} />
      )}
    </article>
  );
};
