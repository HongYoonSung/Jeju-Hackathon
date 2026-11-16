import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResultCard } from '../components/search/ResultCard';
import { useSearchStore } from '../store/useSearchStore';
import { PlaceWithDistance } from '../types/api';

const offlinePlace: PlaceWithDistance = {
  id: 'store_001',
  type: 'offline',
  rank: 1,
  name: '예시마트 노형점',
  price: { amount: 2480, unit_label: '1L', checked_at: '' },
  offline: { address: '제주시 노형동', lat: 33.4846, lng: 126.4783 },
  road: { distance_m: 1200, duration_s: 240, source: 'osrm' },
  crowd: {
    level: 'high',
    estimated_people: 180,
    as_of: '14:00',
    source: 'mock',
  },
};

const onlinePlace: PlaceWithDistance = {
  id: 'online_001',
  type: 'online',
  rank: 2,
  name: '쿠팡',
  price: { amount: 2650, unit_label: '1L', checked_at: '' },
  online: {
    site_name: '쿠팡',
    deeplink_url: 'https://www.coupang.com/np/search?q=%EC%9A%B0%EC%9C%A0',
  },
};

describe('ResultCard Component', () => {
  beforeEach(() => {
    useSearchStore.getState().resetSearch();
  });

  it('오프라인 카드는 [매장] 뱃지를 렌더링한다', () => {
    render(<ResultCard place={offlinePlace} displayIndex={1} />);
    expect(screen.getByText('매장')).toBeDefined();
    expect(screen.getByText('예시마트 노형점')).toBeDefined();
    expect(screen.getByText('약 180명')).toBeDefined();
    expect(screen.getByText('2,480원')).toBeDefined();
  });

  it('온라인 카드는 [사이트] 뱃지를 렌더링한다', () => {
    render(<ResultCard place={onlinePlace} displayIndex={2} />);
    expect(screen.getByText('사이트')).toBeDefined();
    expect(screen.getAllByText('쿠팡').length).toBeGreaterThan(0);
  });

  it('선택되지 않은 오프라인 카드는 [길찾기] 버튼이 보이지 않는다', () => {
    render(<ResultCard place={offlinePlace} displayIndex={1} />);
    expect(screen.queryByText('길찾기')).toBeNull();
  });

  it('오프라인 카드를 클릭하여 선택하면 [길찾기] 버튼이 노출된다', () => {
    render(<ResultCard place={offlinePlace} displayIndex={1} />);
    const card = screen.getByRole('button', { name: /예시마트 노형점/i });
    fireEvent.click(card);

    expect(screen.getByText('길찾기')).toBeDefined();
  });
});
