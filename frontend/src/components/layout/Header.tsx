import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from './Logo';
import { useAuthStore } from '../../store/useAuthStore';
import styles from './Header.module.css';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const authError = useAuthStore((state) => state.errorMessage);
  const [logoutError, setLogoutError] = React.useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/', { replace: true });
    } catch (error) {
      setLogoutError(
        error instanceof Error ? error.message : '로그아웃하지 못했어요.',
      );
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Logo />
        <div className={styles.actions}>
          {user ? (
            <>
              <span className={styles.userName}>{user.id}님</span>
              <button
                type="button"
                className={styles.textButton}
                onClick={handleLogout}
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={styles.textButton}>
                로그인
              </Link>
              <Link to="/signup" className={styles.signupButton}>
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>
      {logoutError && (
        <p className={styles.errorMessage} role="alert">
          {logoutError}
        </p>
      )}
      {authError && (
        <p className={styles.errorMessage} role="alert">
          {authError}
        </p>
      )}
    </header>
  );
};
