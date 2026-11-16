import { create } from 'zustand';
import { ApiError, api } from '../lib/api';
import { AuthUser } from '../types/api';

interface AuthState {
  user: AuthUser | null;
  isInitialized: boolean;
  errorMessage: string | null;
  initialize: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isInitialized: false,
  errorMessage: null,
  initialize: async () => {
    try {
      const user = await api.me();
      set({ user, isInitialized: true, errorMessage: null });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'UNAUTHENTICATED') {
        set({ user: null, isInitialized: true, errorMessage: null });
        return;
      }
      set({
        user: null,
        isInitialized: true,
        errorMessage:
          error instanceof Error
            ? error.message
            : '로그인 상태를 확인하지 못했어요.',
      });
    }
  },
  setUser: (user) => set({ user, isInitialized: true, errorMessage: null }),
  logout: async () => {
    await api.logout();
    set({ user: null, errorMessage: null });
  },
}));
