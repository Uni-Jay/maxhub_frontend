import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { api, clearTokens, setTokens } from "../lib/api";

type User = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  department: string;
  employeeId: string;
  position?: string;
  phoneNumber?: string;
  address?: string;
  avatar?: string;
  emergencyContacts?: string[];
  salaryGrade?: string;
  employmentDate?: string;
  documents?: string[];
  socialLinks?: string[];
  skills?: string[];
  bio?: string;
  performanceScore?: number;
  isActive?: boolean;
  twoFAEnabled: boolean;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshToken: string;
  login: (input: { email: string; password: string; otp?: string }) => Promise<void>;
  register: (input: {
    fullName: string;
    email: string;
    password: string;
    role: string;
    department: string;
    position: string;
    phoneNumber: string;
  }) => Promise<{ otpPreview: string }>;
  verifyEmailOtp: (input: { email: string; otp: string }) => Promise<void>;
  forgotPassword: (email: string) => Promise<{ otpPreview?: string }>;
  resetPassword: (input: { email: string; otp: string; newPassword: string }) => Promise<void>;
  logout: () => Promise<void>;
  reloadProfile: () => Promise<void>;
};

const STORAGE_KEY = "maxhub.auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [storedRefreshToken, setStoredRefreshToken] = useState("");

  const persist = useCallback((payload: { accessToken: string; refreshToken: string; user: User }) => {
    setTokens({ accessToken: payload.accessToken, refreshToken: payload.refreshToken });
    setStoredRefreshToken(payload.refreshToken);
    setUser(payload.user);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        refreshToken: payload.refreshToken,
        accessToken: payload.accessToken,
      })
    );
  }, []);

  const clear = useCallback(() => {
    clearTokens();
    setUser(null);
    setStoredRefreshToken("");
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const reloadProfile = useCallback(async () => {
    const response = await api.get("/auth/me");
    setUser(response.data.data.user);
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setIsLoading(false);
        return;
      }

      try {
        const parsed = JSON.parse(raw) as { accessToken: string; refreshToken: string };
        setTokens(parsed);
        setStoredRefreshToken(parsed.refreshToken);
        await reloadProfile();
      } catch (error) {
        clear();
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, [clear, reloadProfile]);

  const login = useCallback(async (input: { email: string; password: string; otp?: string }) => {
    const response = await api.post("/auth/login", input);
    persist(response.data.data);
  }, [persist]);

  const register = useCallback(
    async (input: {
      fullName: string;
      email: string;
      password: string;
      role: string;
      department: string;
      position: string;
      phoneNumber: string;
    }) => {
      const response = await api.post("/auth/register", input);
      return { otpPreview: response.data.data.emailOtpPreview as string };
    },
    []
  );

  const verifyEmailOtp = useCallback(async (input: { email: string; otp: string }) => {
    await api.post("/auth/verify-email-otp", input);
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    const response = await api.post("/auth/forgot-password", { email });
    return { otpPreview: response.data.data?.otpPreview as string | undefined };
  }, []);

  const resetPassword = useCallback(async (input: { email: string; otp: string; newPassword: string }) => {
    await api.post("/auth/reset-password", input);
  }, []);

  const logout = useCallback(async () => {
    if (storedRefreshToken) {
      try {
        await api.post("/auth/logout", { refreshToken: storedRefreshToken });
      } catch (error) {
        // Best-effort logout.
      }
    }

    clear();
  }, [clear, storedRefreshToken]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      refreshToken: storedRefreshToken,
      login,
      register,
      verifyEmailOtp,
      forgotPassword,
      resetPassword,
      logout,
      reloadProfile,
    }),
    [forgotPassword, isLoading, login, logout, register, reloadProfile, resetPassword, storedRefreshToken, user, verifyEmailOtp]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
