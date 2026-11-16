import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { api } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';

describe('LoginPage', () => {
  beforeEach(() => {
    useAuthStore.getState().setUser(null);
    vi.restoreAllMocks();
  });

  it('로그인에 성공하면 메인 자연어 검색 화면으로 이동한다', async () => {
    vi.spyOn(api, 'login').mockResolvedValue({ id: 'jejuuser' });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<p>오늘 제주 가격, 뭐가 궁금하세요?</p>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('아이디'), {
      target: { value: 'jejuuser' },
    });
    fireEvent.change(screen.getByLabelText('비밀번호'), {
      target: { value: 'secure-pass-123' },
    });
    fireEvent.submit(screen.getByLabelText('비밀번호').closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('오늘 제주 가격, 뭐가 궁금하세요?')).toBeDefined();
    });
    expect(api.login).toHaveBeenCalledWith({
      id: 'jejuuser',
      password: 'secure-pass-123',
    });
    expect(useAuthStore.getState().user?.id).toBe('jejuuser');
  });
});
