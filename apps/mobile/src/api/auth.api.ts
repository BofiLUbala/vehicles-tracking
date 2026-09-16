import { apiClient } from './client';
import { AuthSession, Driver, VerifyOtpDto } from '../types/auth.types';

export const AuthApi = {
  async requestOtp(phone: string, channel: 'WHATSAPP' | 'EMAIL' = 'WHATSAPP'): Promise<void> {
    await apiClient.post('/auth/otp/request', {
      phone,
      channel,
    });
  },

  async resendOtp(phone: string): Promise<void> {
    await apiClient.post('/auth/otp/resend', {
      phone,
    });
  },

  async verifyOtp(dto: VerifyOtpDto): Promise<AuthSession> {
    const response = await apiClient.post<{
      accessToken: string;
      refreshToken: string;
      driver: Driver;
    }>('/auth/otp/verify', dto);
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
