import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthApi } from '../api/auth.api';
import { apiClient } from '../api/client';

// Doit rester SUPÉRIEUR au budget d'envoi SMTP du backend (30 s) : voir EMAIL_SEND_TIMEOUT_MS.
const EMAIL_SEND_TIMEOUT = { timeout: 45_000 };

vi.mock('../api/client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
  setForceLogoutHandler: vi.fn(),
}));

describe('AuthApi Requests (password login, e-mail links only, no codes)', () => {
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

  it("reads the invitation behind the e-mail activation link", async () => {
    (apiClient.post as any).mockResolvedValueOnce({
      data: { firstName: 'Gauthier', lastName: 'Bofi', email: 'driver@company.cd', phone: '+243989805614' },
    });

    const invitation = await AuthApi.getInvitation('tok_abc');

    expect(apiClient.post).toHaveBeenCalledWith('/auth/driver/invitation', { token: 'tok_abc' });
    expect(invitation.firstName).toBe('Gauthier');
  });

  it('activates the account from the invitation link with token, password and deviceId', async () => {
    (apiClient.post as any).mockResolvedValueOnce({
      data: {
        accessToken: 'access_123',
        refreshToken: 'refresh_123',
        driver: { id: 'd_1', firstName: 'Gauthier', lastName: 'Bofi', email: 'driver@company.cd', phone: '', status: 'ACTIVE' },
      },
    });

    const session = await AuthApi.activateInvitation({ token: 'tok_abc', password: 'SignupPass123', deviceId: 'device_abc' });

    expect(apiClient.post).toHaveBeenCalledWith('/auth/driver/activate', {
      token: 'tok_abc',
      password: 'SignupPass123',
      deviceId: 'device_abc',
    });
    expect(session.accessToken).toBe('access_123');
  });

  it('asks for a password-reset link by e-mail (no code), then confirms with the link token', async () => {
    (apiClient.post as any).mockResolvedValueOnce({ data: { message: 'ok' } });

    await AuthApi.requestPasswordReset('driver@company.cd');

    expect(apiClient.post).toHaveBeenCalledWith('/auth/driver/password-reset/request', {
      email: 'driver@company.cd',
    }, EMAIL_SEND_TIMEOUT);

    (apiClient.post as any).mockResolvedValueOnce({ data: { message: 'Mot de passe réinitialisé.' } });

    const res = await AuthApi.confirmPasswordReset({ token: 'tok_reset', newPassword: 'BrandNewPass123' });

    expect(apiClient.post).toHaveBeenCalledWith('/auth/driver/password-reset/confirm', {
      token: 'tok_reset',
      newPassword: 'BrandNewPass123',
    });
    expect(res.message).toContain('réinitialisé');
  });
});
