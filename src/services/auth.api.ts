/**
 * Authentication API Service
 * Handles all authentication-related API calls to the backend
 * 
 * Endpoints:
 * - POST /api/auth/login
 * - POST /api/auth/register
 * - POST /api/auth/logout
 * - POST /api/auth/refresh-token
 * - POST /api/auth/forgot-password
 * - POST /api/auth/reset-password
 * - POST /api/auth/send-otp
 * - POST /api/auth/verify-email
 */

import { apiClient } from './apiClient';
import type {
  LoginPayload,
  RegisterPayload,
  AuthResponse,
  AuthUser,
} from '@/types/index';

export const authApi = {
  /**
   * Login with email and password
   * @param payload - Login credentials
   * @returns AuthResponse with tokens and user info
   */
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', payload);
    return response;
  },

  /**
   * Register new user account
   * @param payload - Registration data
   * @returns AuthResponse with tokens and user info
   */
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', payload);
    return response;
  },

  /**
   * Logout - invalidate session on server
   * @param sessionId - Current session ID
   * @returns Void on success
   */
  async logout(sessionId?: string, refreshToken?: string): Promise<void> {
    await apiClient.post('/auth/logout', { sessionId, refreshToken });
  },

  /**
   * Refresh expired access token
   * @param refreshToken - Current refresh token
   * @returns New access token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const payload = { refreshToken };
    const response = await apiClient.post<AuthResponse>(
      '/auth/refresh-token',
      payload
    );
    return response;
  },

  /**
   * Request password reset email
   * @param email - User email
   * @returns Void on success
   */
  async forgotPassword(email: string): Promise<void> {
    const payload = { email };
    await apiClient.post('/auth/forgot-password', payload);
  },

  /**
   * Reset password using emailed OTP code
   * @param email - User email
   * @param otpCode - 6-digit OTP from email
   * @param newPassword - New password
   * @returns Void on success
   */
  async resetPassword(email: string, otpCode: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/reset-password', { email, otpCode, newPassword });
  },

  /**
   * Verify MFA code after login (for 2FA users)
   * @param sessionId - Session ID returned from login when requiresMFA is true
   * @param otpCode - OTP code from email or authenticator
   * @returns Full auth response with tokens
   */
  async verifyOTPLogin(sessionId: string, otpCode: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/2fa/verify-login', { sessionId, otpCode });
    return response;
  },

  /**
   * Send OTP to email/SMS
   * @param email - User email
   * @param type - OTP type (email or sms)
   * @returns Void on success
   */
  async sendOTP(email: string, type: string): Promise<void> {
    await apiClient.post('/auth/send-otp', { email, type });
  },

  /**
   * Verify OTP code
   * @param code - OTP code
   * @returns Void on success
   */
  async verifyOTP(code: string): Promise<void> {
    await apiClient.post('/auth/verify-email', { code });
  },

  /**
   * Change password (authenticated user)
   * @param currentPassword - Current password
   * @param newPassword - New password
   * @returns Void on success
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/change-password', { currentPassword, newPassword });
  },

  /**
   * Get current user profile
   * @returns User profile data
   */
  async getProfile(): Promise<AuthUser> {
    const response = await apiClient.get<AuthUser>('/auth/profile');
    return response;
  },

  /**
   * Update user profile
   * @param data - Profile fields to update
   * @returns Updated user profile
   */
  async updateProfile(data: Partial<AuthUser>): Promise<AuthUser> {
    const response = await apiClient.patch<AuthUser>('/auth/profile', data);
    return response;
  },

  /**
   * Setup 2FA (Two-Factor Authentication)
   * @param method - 2FA method: TOTP, SMS, or EMAIL
   * @returns QR code or confirmation details
   */
  async setup2FA(method: 'TOTP' | 'SMS' | 'EMAIL'): Promise<{ secret?: string; qrCode?: string }> {
    const response = await apiClient.post<{ secret?: string; qrCode?: string }>('/auth/2fa/setup', { method });
    return response;
  },

  /**
   * Verify 2FA setup with OTP code
   * @param otpCode - OTP code from authenticator
   * @returns Backup codes
   */
  async verify2FASetup(otpCode: string): Promise<{ backupCodes: string[] }> {
    const response = await apiClient.post<{ backupCodes: string[] }>('/auth/2fa/verify', { otpCode });
    return response;
  },

  /**
   * Disable 2FA
   * @param password - User password for confirmation
   * @returns Void on success
   */
  async disable2FA(password: string): Promise<void> {
    await apiClient.post<void>('/auth/2fa/disable', { password });
  },

  /**
   * Verify current password (for sensitive operations)
   * @param password - Password to verify
   * @returns Void on success
   */
  async verifyPassword(password: string): Promise<void> {
    await apiClient.post('/auth/verify-password', { password });
  },

  /**
   * Enable email-based 2FA for the current user
   * @returns Void on success
   */
  async enable2FA(): Promise<void> {
    await apiClient.post('/auth/2fa/enable', {});
  },

  /**
   * Resend login OTP during the MFA step
   * @param sessionId - Session ID returned from login
   * @returns Void on success
   */
  async sendLoginOTP(sessionId: string): Promise<void> {
    await apiClient.post('/auth/2fa/send-login-otp', { sessionId });
  },
};

export default authApi;
