import { create } from 'zustand';
import {
  PlaceResult,
  PlaceWithDistance,
  RouteResponse,
  LatLng,
} from '../types/api';
import { haversine } from '../lib/geo';

export type SearchStatus = 'idle' | 'loading' | 'success' | 'error';
export type SortKey = 'recommend' | 'distance' | 'price';
export type TypeFilter = 'all' | 'offline' | 'online';

interface SearchState {
  status: SearchStatus;
  errorMessage: string | null;
  query: string;
  results: PlaceResult[];
  sortKey: SortKey;
  typeFilter: TypeFilter;
  selectedId: string | null;
  route: RouteResponse | null;
  routeOrigin: LatLng | null;

  setQuery: (q: string) => void;
  setStatus: (status: SearchStatus) => void;
  setErrorMessage: (msg: string | null) => void;
  setResults: (results: PlaceResult[]) => void;
  setSortKey: (sortKey: SortKey) => void;
  setTypeFilter: (filter: TypeFilter) => void;
  setSelectedId: (id: string | null) => void;
  setRoute: (route: RouteResponse | null, origin: LatLng | null) => void;
  clearRoute: () => void;
  resetSearch: () => void;

  getVisibleResults: (userLocation?: LatLng | null) => PlaceWithDistance[];
}

export const useSearchStore = create<SearchState>((set, get) => ({
  status: 'idle',
  errorMessage: null,
  query: '',
  results: [],
  sortKey: 'recommend',
  typeFilter: 'all',
  selectedId: null,
  route: null,
  routeOrigin: null,

  setQuery: (q) => set({ query: q }),
  setStatus: (status) => set({ status }),
  setErrorMessage: (msg) => set({ errorMessage: msg }),
  setResults: (results) =>
    set({
      results,
      status: 'success',
      errorMessage: null,
      selectedId: null,
      route: null,
      routeOrigin: null,
    }),
  setSortKey: (sortKey) => set({ sortKey }),
  setTypeFilter: (typeFilter) => set({ typeFilter }),
  setSelectedId: (id) =>
    set((state) => ({
      selectedId: id,
      // 카드가 바뀌면 기존 경로선 초기화 (SPEC 5.3.6)
      route: state.selectedId === id ? state.route : null,
      routeOrigin: state.selectedId === id ? state.routeOrigin : null,
    })),
  setRoute: (route, origin) => set({ route, routeOrigin: origin }),
  clearRoute: () => set({ route: null, routeOrigin: null }),
  resetSearch: () =>
    set({
      status: 'idle',
      errorMessage: null,
      query: '',
      results: [],
      selectedId: null,
      route: null,
      routeOrigin: null,
    }),

  getVisibleResults: (userLocation?: LatLng | null): PlaceWithDistance[] => {
    const { results, sortKey, typeFilter } = get();

    // 1. 유형 필터 적용 (SPEC 5.3.3)
    let filtered = results.filter((item) => {
      if (typeFilter === 'offline') return item.type === 'offline';
      if (typeFilter === 'online') return item.type === 'online';
      return true;
    });

    // 2. 거리 계산 부착 (SPEC 9.1)
    const withDistance: PlaceWithDistance[] = filtered.map((item) => {
      if (item.type === 'offline' && item.offline && userLocation) {
        const d = haversine(userLocation, {
          lat: item.offline.lat,
          lng: item.offline.lng,
        });
        return { ...item, distance_m: d };
      }
      return { ...item };
    });

    // 3. 정렬 적용 (SPEC 5.3.3 - 모두 오름차순)
    withDistance.sort((a, b) => {
      if (sortKey === 'recommend') {
        return a.rank - b.rank;
      }

      if (sortKey === 'distance') {
        const aIsOff = a.type === 'offline' && a.distance_m !== undefined;
        const bIsOff = b.type === 'offline' && b.distance_m !== undefined;
        if (aIsOff && bIsOff) {
          return (a.distance_m || 0) - (b.distance_m || 0);
        }
        if (aIsOff) return -1;
        if (bIsOff) return 1;
        return a.rank - b.rank; // 온라인끼리는 rank 순
      }

      if (sortKey === 'price') {
        const aPrice = a.price?.amount;
        const bPrice = b.price?.amount;
        if (aPrice != null && bPrice != null) {
          return aPrice - bPrice;
        }
        if (aPrice != null) return -1;
        if (bPrice != null) return 1;
        return a.rank - b.rank;
      }

      return a.rank - b.rank;
    });

    return withDistance;
  },
}));
