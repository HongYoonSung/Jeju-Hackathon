import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Logo.module.css';

export const Logo: React.FC = () => {
  return (
    <Link to="/" className={styles.logoLink} aria-label="제주얼마꽈 홈">
      <svg
        className={styles.icon}
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M2 14C5 11 8 11 11 14C14 17 17 17 20 14C21.5 12.5 22 12.5 23 13"
          stroke="var(--color-primary)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M2 8C5 5 8 5 11 8C14 11 17 11 20 8C21.5 6.5 22 6.5 23 7"
          stroke="var(--color-primary)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <span className={styles.textJeju}>제주</span>
      <span className={styles.textEolmakkwa}>얼마꽈</span>
    </Link>
  );
};
