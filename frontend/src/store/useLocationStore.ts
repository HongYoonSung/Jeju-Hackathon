import { create } from 'zustand';
import { LatLng } from '../types/api';

export interface UserLocation extends LatLng {
  label: string;
  source: 'default' | 'gps' | 'address';
}

interface LocationState {
  location: UserLocation;
  setLocation: (loc: UserLocation) => void;
}

// SPEC 5.3.2 [기본값] 초기 위치는 제주시청
// SPEC-DEFAULT: location-initial-jeju-city-hall
export const useLocationStore = create<LocationState>((set) => ({
  location: {
    lat: 33.4996,
    lng: 126.5312,
    label: '제주시청 부근',
    source: 'default',
  },
  setLocation: (loc) => set({ location: loc }),
}));
