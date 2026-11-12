import React from 'react';
import { Link } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - var(--header-h))',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <h1
        style={{
          fontSize: '36px',
          fontWeight: 800,
          color: 'var(--color-primary)',
          marginBottom: '16px',
        }}
      >
        페이지를 찾을 수 없습니다
      </h1>
      <p
        style={{
          fontSize: '16px',
          color: 'var(--color-text-muted)',
          marginBottom: '24px',
        }}
      >
        요청하신 페이지가 존재하지 않거나 이동되었습니다.
      </p>
      <Link
        to="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '44px',
          padding: '0 24px',
          backgroundColor: 'var(--color-primary)',
          color: '#ffffff',
          borderRadius: 'var(--radius-sm)',
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        홈으로 이동
      </Link>
    </div>
  );
};
