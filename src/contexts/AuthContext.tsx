/**
 * Auth Context
 * Provides authentication state and methods to the entire app
 * Wraps Zustand store with React Context API for easier consumption
 * 
 * Usage:
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 * 
 * Then use: const { user, isAuthenticated, login } = useAuth();
 */

import React, { createContext, useContext, ReactNode, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/services/auth.api';
import { useIdleTimeout } from '@hooks/useIdleTimeout';
import type { AuthUser, AuthTokens } from '@/types/index';

// Auto-logout after this long with zero mouse/keyboard/touch activity. Any
// activity resets the clock, so a user actively working is never logged out.
const IDLE_TIMEOUT_MS = 5 * 60 * 1000;

export interface AuthContextType {
  // State
  user: AuthUser | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Auth Methods
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, otpCode: string, newPassword: string) => Promise<void>;
  verifyOTP: (code: string) => Promise<void>;
  updateProfile: (data: Partial<AuthUser>) => Promise<void>;

  // 2FA Methods
  setup2FA: (method: 'TOTP' | 'SMS' | 'EMAIL') => Promise<{ secret?: string; qrCode?: string }>;
  verify2FASetup: (otpCode: string) => Promise<{ backupCodes: string[] }>;
  disable2FA: (password: string) => Promise<void>;

  // Utility Methods
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  clearError: () => void;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  departmentId?: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth Provider Component
 * Wraps the app and provides authentication context
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const store = useAuthStore();
  const navigate = useNavigate();
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-logout after IDLE_TIMEOUT_MS of no activity — never fires while the
  // user is actually working, since every tracked event resets the clock.
  useIdleTimeout(
    IDLE_TIMEOUT_MS,
    () => {
      store.logout().finally(() => navigate('/auth/login', { replace: true, state: { reason: 'idle' } }));
    },
    store.isAuthenticated,
  );

  // Initialize auth from localStorage on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // persist middleware already rehydrated synchronously; just ensure
        // isAuthenticated reflects the stored state without overwriting user.
        const state = useAuthStore.getState();
        if (state.tokens?.accessToken && state.user) {
          // Check token expiry; if expired, attempt silent refresh
          const { jwtDecode } = await import('jwt-decode');
          try {
            const decoded = jwtDecode<{ exp: number }>(state.tokens.accessToken);
            const isExpired = decoded.exp * 1000 < Date.now();
            if (isExpired) {
              await store.refreshAccessToken?.();
            } else {
              useAuthStore.getState().setUser(state.user);
            }
          } catch {
            // Malformed token — try refresh anyway
            await store.refreshAccessToken?.();
          }
        }
      } catch (err) {
        console.error('Failed to initialize auth:', err);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Login handler
  const handleLogin = useCallback(
    async (email: string, password: string) => {
      setError(null);
      try {
        await store.login(email, password);
      } catch (err: any) {
        const message = err?.response?.data?.error?.message || err?.message || 'Login failed';
        setError(message);
        throw err;
      }
    },
    [store]
  );

  // Register handler
  const handleRegister = useCallback(
    async (data: RegisterData) => {
      setError(null);
      try {
        const response = await authApi.register(data);
        store.setUser(response.user);
        store.setTokens({ accessToken: response.accessToken, refreshToken: response.refreshToken });
      } catch (err: any) {
        const message = err?.response?.data?.error?.message || err?.message || 'Registration failed';
        setError(message);
        throw err;
      }
    },
    [store]
  );

  // Logout handler
  const handleLogout = useCallback(async () => {
    setError(null);
    try {
      await store.logout();
    } catch (err: any) {
      const message = err?.message || 'Logout failed';
      setError(message);
      throw err;
    }
  }, [store]);

  // Refresh token handler
  const handleRefreshAccessToken = useCallback(async () => {
    setError(null);
    try {
      await store.refreshAccessToken?.();
    } catch (err: any) {
      const message = err?.message || 'Token refresh failed';
      setError(message);
      throw err;
    }
  }, [store]);

  // Change password handler
  const handleChangePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      setError(null);
      try {
        await authApi.changePassword(currentPassword, newPassword);
      } catch (err: any) {
        const message = err?.response?.data?.error?.message || err?.message || 'Password change failed';
        setError(message);
        throw err;
      }
    },
    []
  );

  // Forgot password handler
  const handleForgotPassword = useCallback(async (email: string) => {
    setError(null);
    try {
      await authApi.forgotPassword(email);
    } catch (err: any) {
      const message = err?.response?.data?.error?.message || err?.message || 'Failed to send reset email';
      setError(message);
      throw err;
    }
  }, []);

  // Reset password handler
  const handleResetPassword = useCallback(
    async (email: string, otpCode: string, newPassword: string) => {
      setError(null);
      try {
        await authApi.resetPassword(email, otpCode, newPassword);
      } catch (err: any) {
        const message = err?.response?.data?.error?.message || err?.message || 'Password reset failed';
        setError(message);
        throw err;
      }
    },
    []
  );

  // Verify OTP handler
  const handleVerifyOTP = useCallback(async (code: string) => {
    setError(null);
    try {
      await authApi.verifyOTP(code);
    } catch (err: any) {
      const message = err?.response?.data?.error?.message || err?.message || 'OTP verification failed';
      setError(message);
      throw err;
    }
  }, []);

  // Update profile handler
  const handleUpdateProfile = useCallback(async (data: Partial<AuthUser>) => {
    setError(null);
    try {
      const updated = await authApi.updateProfile(data);
      store.setUser(updated);
    } catch (err: any) {
      const message = err?.response?.data?.error?.message || err?.message || 'Profile update failed';
      setError(message);
      throw err;
    }
  }, [store]);

  // Setup 2FA handler
  const handleSetup2FA = useCallback(
    async (method: 'TOTP' | 'SMS' | 'EMAIL') => {
      setError(null);
      try {
        return await authApi.setup2FA(method);
      } catch (err: any) {
        const message = err?.response?.data?.error?.message || err?.message || '2FA setup failed';
        setError(message);
        throw err;
      }
    },
    []
  );

  // Verify 2FA setup handler
  const handleVerify2FASetup = useCallback(async (otpCode: string) => {
    setError(null);
    try {
      return await authApi.verify2FASetup(otpCode);
    } catch (err: any) {
      const message = err?.response?.data?.error?.message || err?.message || '2FA verification failed';
      setError(message);
      throw err;
    }
  }, []);

  // Disable 2FA handler
  const handleDisable2FA = useCallback(async (password: string) => {
    setError(null);
    try {
      await authApi.disable2FA(password);
    } catch (err: any) {
      const message = err?.response?.data?.error?.message || err?.message || '2FA disable failed';
      setError(message);
      throw err;
    }
  }, []);

  // Permission checking
  const hasPermission = useCallback((permission: string): boolean => {
    return store.user?.permissions?.includes(permission) || false;
  }, [store.user]);

  const hasRole = useCallback((role: string): boolean => {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
    const target = norm(role);
    return (store.user?.roles ?? []).some((r) => norm(r ?? '') === target);
  }, [store.user]);

  const hasAnyPermission = useCallback((permissions: string[]): boolean => {
    return permissions.some(p => store.user?.permissions?.includes(p)) || false;
  }, [store.user]);

  const hasAllPermissions = useCallback((permissions: string[]): boolean => {
    return permissions.every(p => store.user?.permissions?.includes(p)) || false;
  }, [store.user]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    // State
    user: store.user || null,
    tokens: store.tokens || null,
    isAuthenticated: store.isAuthenticated || false,
    isLoading: store.isLoading || false,
    isInitialized,
    error: error || store.error || null,

    // Auth Methods
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    refreshAccessToken: handleRefreshAccessToken,
    changePassword: handleChangePassword,
    forgotPassword: handleForgotPassword,
    resetPassword: handleResetPassword,
    verifyOTP: handleVerifyOTP,
    updateProfile: handleUpdateProfile,

    // 2FA Methods
    setup2FA: handleSetup2FA,
    verify2FASetup: handleVerify2FASetup,
    disable2FA: handleDisable2FA,

    // Utility Methods
    hasPermission,
    hasRole,
    hasAnyPermission,
    hasAllPermissions,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook to use Auth Context
 * Must be used within AuthProvider
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
