import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HomePage } from '../pages/HomePage';
import { api } from '../lib/api';
import { useSearchStore } from '../store/useSearchStore';

describe('HomePage', () => {
  beforeEach(() => {
    useSearchStore.getState().resetSearch();
    vi.restoreAllMocks();
  });

  it('검색 전에는 지도를 보여주지 않고 검색 후에 결과 화면으로 이동한다', async () => {
    vi.spyOn(api, 'search').mockResolvedValue({
      request_id: 'request-1',
      query: '노형동 우유',
      generated_at: '2026-11-16T00:00:00+09:00',
      results: [],
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<p>검색 결과 화면</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByRole('region', { name: '지도' })).toBeNull();
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '노형동 우유' },
    });
    fireEvent.submit(screen.getByRole('textbox').closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('검색 결과 화면')).toBeDefined();
    });
    expect(api.search).toHaveBeenCalledWith(
      expect.objectContaining({ query: '노형동 우유' }),
    );
  });
});
