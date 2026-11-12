import React from 'react';
import { CrowdInfo } from '../../types/api';
import { crowdMeta } from '../../lib/crowd';
import styles from './CrowdBadge.module.css';

interface CrowdBadgeProps {
  crowd?: CrowdInfo | null;
}

export const CrowdBadge: React.FC<CrowdBadgeProps> = ({ crowd }) => {
  if (!crowd) {
    return null;
  }

  const { color } = crowdMeta(crowd.level);

  return (
    <span
      className={styles.crowdBadge}
      title={`기준 시각 ${crowd.as_of}`}
      aria-label={`혼잡도: 약 ${crowd.estimated_people}명`}
    >
      <span
        className={styles.dot}
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span className={styles.text}>약 {crowd.estimated_people}명</span>
    </span>
  );
};
