import { create } from 'zustand';
import {
  PlaceResult,
  PlaceWithDistance,
  MetricResult,
  RouteResponse,
  LatLng,
} from '../types/api';

export type SearchStatus = 'idle' | 'loading' | 'success' | 'error';
export type SortKey = 'recommend' | 'distance' | 'price';
export type TypeFilter = 'all' | 'offline' | 'online';

interface SearchState {
  status: SearchStatus;
  errorMessage: string | null;
  query: string;
  agentBriefing: string | null;
  results: PlaceResult[];
  sortKey: SortKey;
  typeFilter: TypeFilter;
  selectedId: string | null;
  route: RouteResponse | null;
  routeOrigin: LatLng | null;
  metricsLoading: boolean;

  setQuery: (q: string) => void;
  setAgentBriefing: (briefing: string | null) => void;
  setStatus: (status: SearchStatus) => void;
  setErrorMessage: (msg: string | null) => void;
  setResults: (results: PlaceResult[]) => void;
  setSortKey: (sortKey: SortKey) => void;
  setTypeFilter: (filter: TypeFilter) => void;
  setSelectedId: (id: string | null) => void;
  setRoute: (route: RouteResponse | null, origin: LatLng | null) => void;
  setMetricsLoading: (loading: boolean) => void;
  setRoadMetrics: (metrics: MetricResult[]) => void;
  clearRoute: () => void;
  resetSearch: () => void;

  getVisibleResults: () => PlaceWithDistance[];
}

export const useSearchStore = create<SearchState>((set, get) => ({
  status: 'idle',
  errorMessage: null,
  query: '',
  agentBriefing: null,
  results: [],
  sortKey: 'recommend',
  typeFilter: 'all',
  selectedId: null,
  route: null,
  routeOrigin: null,
  metricsLoading: false,

  setQuery: (q) => set({ query: q }),
  setAgentBriefing: (agentBriefing) => set({ agentBriefing }),
  setStatus: (status) => set({ status }),
  setErrorMessage: (msg) => set({ errorMessage: msg }),
  setResults: (results) =>
    set({
      results,
      agentBriefing: null,
      status: 'success',
      errorMessage: null,
      selectedId: null,
      route: null,
      routeOrigin: null,
      metricsLoading: false,
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
  setMetricsLoading: (metricsLoading) => set({ metricsLoading }),
  setRoadMetrics: (metrics: MetricResult[]) =>
    set((state) => {
      const metricsById = new Map(metrics.map((metric) => [metric.id, metric]));
      return {
        results: state.results.map((result) =>
          result.type === 'offline'
            ? { ...result, road: metricsById.get(result.id) ?? null }
            : result,
        ),
      };
    }),
  clearRoute: () => set({ route: null, routeOrigin: null }),
  resetSearch: () =>
    set({
      status: 'idle',
      errorMessage: null,
      query: '',
      agentBriefing: null,
      results: [],
      selectedId: null,
      route: null,
      routeOrigin: null,
      metricsLoading: false,
    }),

  getVisibleResults: (): PlaceWithDistance[] => {
    const { results, sortKey, typeFilter } = get();

    // 1. 유형 필터 적용 (SPEC 5.3.3)
    let filtered = results.filter((item) => {
      if (typeFilter === 'offline') return item.type === 'offline';
      if (typeFilter === 'online') return item.type === 'online';
      return true;
    });

    // Road distance comes from the routing provider, never from client-side geometry.
    const withRoadMetrics: PlaceWithDistance[] = filtered.map((item) => ({ ...item }));

    withRoadMetrics.sort((a, b) => {
      if (sortKey === 'recommend') {
        return a.rank - b.rank;
      }

      if (sortKey === 'distance') {
        if (a.type === 'offline' && b.type === 'offline') {
          const aDistance = a.road?.distance_m;
          const bDistance = b.road?.distance_m;
          if (aDistance !== undefined && bDistance !== undefined) {
            return aDistance - bDistance;
          }
          if (aDistance !== undefined) return -1;
          if (bDistance !== undefined) return 1;
          return a.rank - b.rank;
        }
        if (a.type === 'offline') return -1;
        if (b.type === 'offline') return 1;
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

    return withRoadMetrics;
  },
}));
