import React from 'react';
import styles from './TypeBadge.module.css';

interface TypeBadgeProps {
  type: 'offline' | 'online';
}

export const TypeBadge: React.FC<TypeBadgeProps> = ({ type }) => {
  const isOffline = type === 'offline';
  return (
    <span
      className={`${styles.badge} ${
        isOffline ? styles.offline : styles.online
      }`}
    >
      {isOffline ? '매장' : '사이트'}
    </span>
  );
};
