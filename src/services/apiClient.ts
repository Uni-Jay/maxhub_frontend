import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import { useAuthStore } from '@store/authStore';
import { ApiResponse } from '@/types';


const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_REACT_APP_API_URL ||
  import.meta.env.VITE_APP_API_URL ||
  'http://localhost:3000/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      (config) => {
        const state = useAuthStore.getState();
        if (state.tokens?.accessToken) {
          config.headers.Authorization = `Bearer ${state.tokens.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle 401 and token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const state = useAuthStore.getState();
            if (state.tokens?.refreshToken) {
              await state.refreshAccessToken();
              const newToken = useAuthStore.getState().tokens?.accessToken;
              if (newToken) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return this.client(originalRequest);
              }
            }
          } catch (refreshError) {
            useAuthStore.getState().clearAuth();
            return Promise.reject(refreshError);
          }
        }

        // Surface the backend's actual message (e.g. "A staff member with this
        // email already exists") instead of Axios's generic "Request failed
        // with status code 409" — every route responds via ResponseFormatter,
        // which always puts the real reason in response.data.message.
        const backendMessage = (error.response?.data as any)?.message;
        if (backendMessage) {
          error.message = backendMessage;
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * GET request
   */
  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url, { params });
    return response.data.data as T;
  }

  /**
   * POST request
   */
  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, data);
    return response.data.data as T;
  }

  /**
   * PATCH request
   */
  async patch<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.patch<ApiResponse<T>>(url, data);
    return response.data.data as T;
  }

  /**
   * PUT request
   */
  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put<ApiResponse<T>>(url, data);
    return response.data.data as T;
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<ApiResponse<T>>(url);
    return response.data.data as T;
  }

  /**
   * GET request with full response
   */
  async getFullResponse<T>(url: string, params?: any): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.client.get<ApiResponse<T>>(url, { params });
  }

  /**
   * GET raw data
   */
  async getRaw(url: string, params?: any): Promise<any> {
    const response = await this.client.get(url, { params });
    return response.data;
  }
}

export const apiClient = new ApiClient();
