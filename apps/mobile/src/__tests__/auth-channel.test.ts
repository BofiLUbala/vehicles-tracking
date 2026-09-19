import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthApi } from '../api/auth.api';
import { apiClient } from '../api/client';

vi.mock('../api/client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
  setForceLogoutHandler: vi.fn(),
}));

describe('AuthApi Requests (password login + OTP activation/recovery only)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends driverLogin payload with phone, password and deviceId (no OTP)', async () => {
    (apiClient.post as any).mockResolvedValueOnce({
      data: {
        accessToken: 'access_123',
        refreshToken: 'refresh_123',
        driver: { id: 'd_1', firstName: 'Gauthier', status: 'ACTIVE' },
      },
    });

    const session = await AuthApi.driverLogin({
      phone: '+243989805614',
      password: 'DriverPass123',
      deviceId: 'device_abc',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/auth/driver/login', {
      phone: '+243989805614',
      password: 'DriverPass123',
      deviceId: 'device_abc',
    });
    expect(session.accessToken).toBe('access_123');
  });

  it('sends Email SIGN_UP requestOtp payload with mode, channel, email, firstName, lastName', async () => {
    (apiClient.post as any).mockResolvedValueOnce({
      data: { success: true, message: 'OTP envoyé par e-mail' },
    });

    await AuthApi.requestOtp({
      mode: 'SIGN_UP',
      channel: 'EMAIL',
      email: 'driver@company.cd',
      firstName: 'Gauthier',
      lastName: 'Bofi',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/auth/otp/request', {
      mode: 'SIGN_UP',
      channel: 'EMAIL',
      email: 'driver@company.cd',
      firstName: 'Gauthier',
      lastName: 'Bofi',
    });
  });

  it('sends Email SIGN_UP verifyOtp payload with code, password, email, name, and deviceId', async () => {
    const mockSession = {
      accessToken: 'access_123',
      refreshToken: 'refresh_123',
      driver: { id: 'd_1', firstName: 'Gauthier', lastName: 'Bofi', email: 'driver@company.cd', phone: '', status: 'ACTIVE' },
    };

    (apiClient.post as any).mockResolvedValueOnce({
      data: mockSession,
    });

    const session = await AuthApi.verifyOtp({
      mode: 'SIGN_UP',
      channel: 'EMAIL',
      email: 'driver@company.cd',
      code: '654321',
      password: 'SignupPass123',
      firstName: 'Gauthier',
      lastName: 'Bofi',
      deviceId: 'device_abc',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/auth/otp/verify', {
      mode: 'SIGN_UP',
      channel: 'EMAIL',
      email: 'driver@company.cd',
      code: '654321',
      password: 'SignupPass123',
      firstName: 'Gauthier',
      lastName: 'Bofi',
      deviceId: 'device_abc',
    });
    expect(session.accessToken).toBe('access_123');
    expect(session.driver.firstName).toBe('Gauthier');
  });

  it('sends resendOtp payload with SIGN_UP mode, channel and target', async () => {
    (apiClient.post as any).mockResolvedValueOnce({
      data: { success: true },
    });

    await AuthApi.resendOtp({
      mode: 'SIGN_UP',
      channel: 'WHATSAPP',
      phone: '+243989805614',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/auth/otp/resend', {
      mode: 'SIGN_UP',
      channel: 'WHATSAPP',
      phone: '+243989805614',
    });
  });

  it('sends password-reset request and verify payloads', async () => {
    (apiClient.post as any).mockResolvedValueOnce({ data: { message: 'ok' } });

    await AuthApi.requestPasswordReset({ channel: 'WHATSAPP', phone: '+243989805614' });

    expect(apiClient.post).toHaveBeenCalledWith('/auth/password-reset/request', {
      channel: 'WHATSAPP',
      phone: '+243989805614',
    });

    (apiClient.post as any).mockResolvedValueOnce({ data: { message: 'Mot de passe réinitialisé.' } });

    const res = await AuthApi.verifyPasswordReset({
      channel: 'WHATSAPP',
      phone: '+243989805614',
      code: '123456',
      newPassword: 'BrandNewPass123',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/auth/password-reset/verify', {
      channel: 'WHATSAPP',
      phone: '+243989805614',
      code: '123456',
      newPassword: 'BrandNewPass123',
    });
    expect(res.message).toContain('réinitialisé');
  });
});
