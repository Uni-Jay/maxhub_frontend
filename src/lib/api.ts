import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

let accessToken = "";
let refreshToken = "";

export function setTokens(tokens: { accessToken: string; refreshToken: string }) {
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
}

export function clearTokens() {
  accessToken = "";
  refreshToken = "";
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      refreshToken
    ) {
      originalRequest._retry = true;

      try {
        const response = await api.post("/auth/refresh-token", { refreshToken });
        const nextAccessToken = response.data.data.accessToken;
        accessToken = nextAccessToken;
        originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        clearTokens();
      }
    }

    return Promise.reject(error);
  }
);
