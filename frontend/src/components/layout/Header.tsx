import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Logo } from './Logo';
import styles from './Header.module.css';

export const Header: React.FC = () => {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.left}>
          <Logo />
        </div>

        <nav className={styles.center} aria-label="메인 메뉴">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            }
          >
            홈
          </NavLink>
          <NavLink
            to="/search"
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            }
          >
            가격 검색
          </NavLink>
        </nav>

        <div className={styles.right}>
          <Link to="/login" className={styles.outlineBtn}>
            로그인
          </Link>
          <Link to="/signup" className={styles.outlineBtn}>
            회원가입
          </Link>
        </div>
      </div>
    </header>
  );
};
