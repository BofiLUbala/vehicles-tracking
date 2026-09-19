import { apiClient } from './client';
import {
  AuthSession,
  Driver,
  DriverLoginDto,
  RequestOtpDto,
  RequestPasswordResetDto,
  ResendOtpDto,
  VerifyOtpDto,
  VerifyPasswordResetDto,
} from '../types/auth.types';

export const AuthApi = {
  async requestOtp(payload: RequestOtpDto | string, channel?: 'WHATSAPP' | 'EMAIL'): Promise<void> {
    const body: RequestOtpDto =
      typeof payload === 'string'
        ? { phone: payload, channel: channel ?? 'WHATSAPP' }
        : payload;
    await apiClient.post('/auth/otp/request', body);
  },

  async resendOtp(payload: ResendOtpDto | string, channel?: 'WHATSAPP' | 'EMAIL'): Promise<void> {
    const body: ResendOtpDto =
      typeof payload === 'string'
        ? { phone: payload, channel: channel ?? 'WHATSAPP' }
        : payload;
    await apiClient.post('/auth/otp/resend', body);
  },

  async verifyOtp(dto: VerifyOtpDto): Promise<AuthSession> {
    const response = await apiClient.post<{
      accessToken: string;
      refreshToken: string;
      driver: Driver;
    }>('/auth/otp/verify', dto);
    return response.data;
  },

  /** Connexion chauffeur par identifiant + mot de passe (sans OTP). */
  async driverLogin(dto: DriverLoginDto): Promise<AuthSession> {
    const response = await apiClient.post<{
      accessToken: string;
      refreshToken: string;
      driver: Driver;
    }>('/auth/driver/login', dto);
    return response.data;
  },

  async requestPasswordReset(payload: RequestPasswordResetDto): Promise<void> {
    await apiClient.post('/auth/password-reset/request', payload);
  },

  async verifyPasswordReset(payload: VerifyPasswordResetDto): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/auth/password-reset/verify', payload);
    return response.data;
  },

  async getProfile(): Promise<Driver> {
    const response = await apiClient.get<Driver>('/auth/profile');
    return response.data;
  },

  async logout(refreshToken?: string | null): Promise<void> {
    if (refreshToken) {
      try {
        await apiClient.post('/auth/logout', { refreshToken });
      } catch {
        // Ignore network errors on logout
      }
    }
  },
};
