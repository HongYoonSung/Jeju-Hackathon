import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './HomePage.module.css';

export const HomePage: React.FC = () => {
  const [imgSrc, setImgSrc] = useState('/hero-jeju.jpg');

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        {/* 좌측 텍스트 블록 (SPEC 5.1) */}
        <section className={styles.textBlock}>
          <h1 className={styles.heroTitle}>제주 얼마꽈?</h1>
          <h2 className={styles.subTitle}>오늘 값 얼마인지 한 번에 알앙 갑서~</h2>
          <p className={styles.description}>제주도 오늘의 가격 한번에 알아보기</p>

          <div className={styles.buttonRow}>
            <Link to="/login" className={styles.primaryBtn}>
              로그인
            </Link>
            <Link to="/signup" className={styles.outlineBtn}>
              회원가입
            </Link>
          </div>
        </section>

        {/* 우측 이미지 영역 HeroImage (SPEC 5.1) */}
        <section className={styles.imageBlock}>
          <img
            src={imgSrc}
            alt="제주 풍경"
            className={styles.heroImage}
            onError={() => {
              // hero-jeju.jpg 부재 시 placeholder svg로 폴백
              setImgSrc('/hero-jeju-placeholder.svg');
            }}
          />
        </section>
      </div>
    </main>
  );
};
