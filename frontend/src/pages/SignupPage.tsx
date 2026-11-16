import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import styles from './Auth.module.css';

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [serverNotice, setServerNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    let valid = true;
    setUsernameError(null);
    setPasswordError(null);
    setConfirmError(null);

    // 아이디 4~20자 영문·숫자 (SPEC 5.2)
    const idRegex = /^[a-zA-Z0-9]{4,20}$/;
    if (!idRegex.test(username.trim())) {
      setUsernameError('아이디는 4~20자의 영문 및 숫자여야 합니다.');
      valid = false;
    }

    // 비밀번호 8자 이상 (SPEC 5.2)
    if (password.length < 8) {
      setPasswordError('비밀번호는 8자 이상이어야 합니다.');
      valid = false;
    }

    // 비밀번호 확인 일치 (SPEC 5.2)
    if (password !== passwordConfirm) {
      setConfirmError('비밀번호가 일치하지 않습니다.');
      valid = false;
    }

    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setServerNotice(null);

    try {
      const user = await api.signup({
        id: username.trim(),
        password,
        passwordConfirm,
      });
      setUser(user);
      navigate('/', { replace: true });
    } catch (error) {
      setServerNotice(
        error instanceof Error ? error.message : '회원가입에 실패했어요.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authCard}>
        <h1 className={styles.title}>회원가입</h1>

        {serverNotice && (
          <div className={styles.bannerNotice} role="status">
            {serverNotice}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.field}>
            <label htmlFor="signup-id" className={styles.label}>
              아이디
            </label>
            <input
              id="signup-id"
              type="text"
              className={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isSubmitting}
            />
            {usernameError && (
              <span className={styles.fieldError}>{usernameError}</span>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="signup-pw" className={styles.label}>
              비밀번호
            </label>
            <input
              id="signup-pw"
              type="password"
              maxLength={128}
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
            {passwordError && (
              <span className={styles.fieldError}>{passwordError}</span>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="signup-pw-confirm" className={styles.label}>
              비밀번호 확인
            </label>
            <input
              id="signup-pw-confirm"
              type="password"
              maxLength={128}
              className={styles.input}
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              disabled={isSubmitting}
            />
            {confirmError && (
              <span className={styles.fieldError}>{confirmError}</span>
            )}
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isSubmitting}
          >
            {isSubmitting ? '처리 중…' : '회원가입'}
          </button>
        </form>

        <p className={styles.switchText}>
          이미 계정이 있으신가요?
          <Link to="/login" className={styles.switchLink}>
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
};
