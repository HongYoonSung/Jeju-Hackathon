import { describe, it, expect, beforeEach } from 'vitest';
import { useSearchStore } from '../store/useSearchStore';
import { PlaceResult } from '../types/api';

const mockPlaces: PlaceResult[] = [
  {
    id: 'store_1',
    type: 'offline',
    rank: 1,
    name: '노형마트',
    price: { amount: 3000, unit_label: '1개', checked_at: '' },
    offline: { address: '노형동', lat: 33.4846, lng: 126.4783 },
    road: { distance_m: 39500, duration_s: 3300, source: 'osrm' },
    online: null,
  },
  {
    id: 'store_2',
    type: 'offline',
    rank: 3,
    name: '서귀포마트',
    price: { amount: 2000, unit_label: '1개', checked_at: '' },
    offline: { address: '서귀포', lat: 33.2541, lng: 126.5601 },
    road: { distance_m: 4200, duration_s: 720, source: 'osrm' },
    online: null,
  },
  {
    id: 'online_1',
    type: 'online',
    rank: 2,
    name: '쿠팡',
    price: { amount: 2500, unit_label: '1개', checked_at: '' },
    offline: null,
    online: { site_name: '쿠팡', deeplink_url: 'https://www.coupang.com/' },
  },
];

describe('useSearchStore Filter and Sort Combinations', () => {
  beforeEach(() => {
    useSearchStore.getState().resetSearch();
    useSearchStore.getState().setResults(mockPlaces);
  });

  // 조합 1: all + recommend
  it('조합 1: 전체 + 추천순', () => {
    const store = useSearchStore.getState();
    store.setTypeFilter('all');
    store.setSortKey('recommend');

    const res = store.getVisibleResults();
    expect(res).toHaveLength(3);
    expect(res.map((r) => r.id)).toEqual(['store_1', 'online_1', 'store_2']);
  });

  // 조합 2: all + road distance
  it('조합 2: 전체 + 도로 거리순 (직선거리와 무관하게 온라인은 뒤에 배치)', () => {
    const store = useSearchStore.getState();
    store.setTypeFilter('all');
    store.setSortKey('distance');

    const res = store.getVisibleResults();
    expect(res).toHaveLength(3);
    expect(res[0].id).toBe('store_2');
    expect(res[1].id).toBe('store_1');
    expect(res[2].id).toBe('online_1');
  });

  it('도로 측정값이 없는 오프라인 매장은 온라인 결과보다 뒤에 정렬한다', () => {
    const store = useSearchStore.getState();
    store.setResults([
      { ...mockPlaces[0], road: null },
      mockPlaces[2],
      mockPlaces[1],
    ]);
    store.setTypeFilter('all');
    store.setSortKey('distance');

    expect(store.getVisibleResults().map((result) => result.id)).toEqual([
      'store_2',
      'store_1',
      'online_1',
    ]);
  });

  // 조합 3: all + price
  it('조합 3: 전체 + 가격순', () => {
    const store = useSearchStore.getState();
    store.setTypeFilter('all');
    store.setSortKey('price');

    const res = store.getVisibleResults();
    expect(res).toHaveLength(3);
    // 2000(store_2) -> 2500(online_1) -> 3000(store_1)
    expect(res.map((r) => r.id)).toEqual(['store_2', 'online_1', 'store_1']);
  });

  // 조합 4: offline + recommend
  it('조합 4: 오프라인 + 추천순', () => {
    const store = useSearchStore.getState();
    store.setTypeFilter('offline');
    store.setSortKey('recommend');

    const res = store.getVisibleResults();
    expect(res).toHaveLength(2);
    expect(res.map((r) => r.id)).toEqual(['store_1', 'store_2']);
  });

  // 조합 5: offline + price
  it('조합 5: 오프라인 + 가격순', () => {
    const store = useSearchStore.getState();
    store.setTypeFilter('offline');
    store.setSortKey('price');

    const res = store.getVisibleResults();
    expect(res).toHaveLength(2);
    expect(res.map((r) => r.id)).toEqual(['store_2', 'store_1']);
  });

  // 조합 6: online + recommend
  it('조합 6: 온라인 + 추천순', () => {
    const store = useSearchStore.getState();
    store.setTypeFilter('online');
    store.setSortKey('recommend');

    const res = store.getVisibleResults();
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe('online_1');
  });
});
