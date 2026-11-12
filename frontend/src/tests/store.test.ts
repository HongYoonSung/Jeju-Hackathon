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
    online: null,
  },
  {
    id: 'store_2',
    type: 'offline',
    rank: 3,
    name: '서귀포마트',
    price: { amount: 2000, unit_label: '1개', checked_at: '' },
    offline: { address: '서귀포', lat: 33.2541, lng: 126.5601 },
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

const userLocation = { lat: 33.4996, lng: 126.5312 }; // 제주시청 부근

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

    const res = store.getVisibleResults(userLocation);
    expect(res).toHaveLength(3);
    expect(res.map((r) => r.id)).toEqual(['store_1', 'online_1', 'store_2']);
  });

  // 조합 2: all + distance
  it('조합 2: 전체 + 거리순 (오프라인 거리순 -> 온라인 뒤에 rank순)', () => {
    const store = useSearchStore.getState();
    store.setTypeFilter('all');
    store.setSortKey('distance');

    const res = store.getVisibleResults(userLocation);
    expect(res).toHaveLength(3);
    // 노형마트가 서귀포마트보다 제주시청에 가까움 -> 노형, 서귀포, 온라인
    expect(res[0].id).toBe('store_1');
    expect(res[1].id).toBe('store_2');
    expect(res[2].id).toBe('online_1');
  });

  // 조합 3: all + price
  it('조합 3: 전체 + 가격순', () => {
    const store = useSearchStore.getState();
    store.setTypeFilter('all');
    store.setSortKey('price');

    const res = store.getVisibleResults(userLocation);
    expect(res).toHaveLength(3);
    // 2000(store_2) -> 2500(online_1) -> 3000(store_1)
    expect(res.map((r) => r.id)).toEqual(['store_2', 'online_1', 'store_1']);
  });

  // 조합 4: offline + recommend
  it('조합 4: 오프라인 + 추천순', () => {
    const store = useSearchStore.getState();
    store.setTypeFilter('offline');
    store.setSortKey('recommend');

    const res = store.getVisibleResults(userLocation);
    expect(res).toHaveLength(2);
    expect(res.map((r) => r.id)).toEqual(['store_1', 'store_2']);
  });

  // 조합 5: offline + price
  it('조합 5: 오프라인 + 가격순', () => {
    const store = useSearchStore.getState();
    store.setTypeFilter('offline');
    store.setSortKey('price');

    const res = store.getVisibleResults(userLocation);
    expect(res).toHaveLength(2);
    expect(res.map((r) => r.id)).toEqual(['store_2', 'store_1']);
  });

  // 조합 6: online + recommend
  it('조합 6: 온라인 + 추천순', () => {
    const store = useSearchStore.getState();
    store.setTypeFilter('online');
    store.setSortKey('recommend');

    const res = store.getVisibleResults(userLocation);
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe('online_1');
  });
});
