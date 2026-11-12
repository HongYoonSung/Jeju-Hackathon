import React from 'react';
import styles from './PageBanner.module.css';

interface PageBannerProps {
  children?: React.ReactNode;
}

export const PageBanner: React.FC<PageBannerProps> = ({ children }) => {
  return (
    <div className={styles.banner}>
      <svg
        className={styles.wavePattern}
        viewBox="0 0 1440 96"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M0 48C240 18 480 78 720 48C960 18 1200 78 1440 48"
          stroke="var(--color-banner-line)"
          strokeWidth="1"
          strokeOpacity="0.7"
        />
        <path
          d="M0 64C200 34 520 84 800 54C1080 24 1320 74 1440 54"
          stroke="var(--color-banner-line)"
          strokeWidth="1"
          strokeOpacity="0.7"
        />
      </svg>
      <div className={styles.content}>{children}</div>
    </div>
  );
};
