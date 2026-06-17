import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser, AuthTokens } from '@/types/index';
import { authApi } from '@services/auth.api';

interface AuthState {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: AuthUser | null) => void;
  setTokens: (tokens: AuthTokens) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  register: (data: any) => Promise<void>;
  initializeAuth: () => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setTokens: (tokens) => set({ tokens }),
      setError: (error) => set({ error }),
      setLoading: (isLoading) => set({ isLoading }),

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login({ email, password });
          set({
            user: response.user,
            tokens: {
              accessToken: response.accessToken,
              refreshToken: response.refreshToken,
            },
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: error.message || 'Login failed',
            isLoading: false,
          });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          const state = get();
          if (state.tokens?.refreshToken) {
            await authApi.logout(undefined, state.tokens.refreshToken);
          }
        } finally {
          set({
            user: null,
            tokens: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      refreshAccessToken: async () => {
        const state = get();
        if (!state.tokens?.refreshToken) {
          set({ isAuthenticated: false });
          return;
        }

        try {
          const response = await authApi.refreshToken(state.tokens.refreshToken);
          set({
            tokens: {
              ...state.tokens,
              accessToken: response.accessToken,
            },
          });
        } catch (error) {
          set({
            user: null,
            tokens: null,
            isAuthenticated: false,
          });
        }
      },

      register: async (data: any) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.register(data);
          set({
            user: response.user,
            tokens: {
              accessToken: response.accessToken,
              refreshToken: response.refreshToken,
            },
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: error.message || 'Registration failed',
            isLoading: false,
          });
          throw error;
        }
      },

      initializeAuth: () => {
        // Initialize from localStorage (handled by persist middleware)
        // Token expiration check can be done here
        const state = get();
        if (state.tokens?.accessToken) {
          // Could check if token is expired and refresh if needed
          set({ isAuthenticated: true });
        }
      },

      clearAuth: () => {
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          error: null,
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
