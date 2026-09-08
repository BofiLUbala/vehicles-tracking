import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/device-id', () => ({
  getDeviceId: () => 'device-123',
}));

const loginAdminMock = vi.fn();
const verifyAdminOtpMock = vi.fn();

vi.mock('@/features/auth/api', () => ({
  loginAdmin: (...args: unknown[]) => loginAdminMock(...args),
  verifyAdminOtp: (...args: unknown[]) => verifyAdminOtpMock(...args),
}));

import { LoginForm } from '@/features/auth/login-form';

describe('LoginForm', () => {
  beforeEach(() => {
    pushMock.mockReset();
    refreshMock.mockReset();
    loginAdminMock.mockReset();
    verifyAdminOtpMock.mockReset();
  });

  it('submits credentials and redirects when no OTP is required', async () => {
    loginAdminMock.mockResolvedValue({ requiresOtp: false });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/e-mail/i), 'admin@exemple.com');
    await user.type(screen.getByLabelText(/mot de passe/i), 'password123');
    await user.click(screen.getByRole('button', { name: /se connecter/i }));

    await waitFor(() => expect(loginAdminMock).toHaveBeenCalledWith('admin@exemple.com', 'password123', 'device-123'));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/tracking'));
  });

  it('shows the OTP step when the API responds with requiresOtp', async () => {
    loginAdminMock.mockResolvedValue({ requiresOtp: true, message: 'Nouvel appareil détecté' });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/e-mail/i), 'admin@exemple.com');
    await user.type(screen.getByLabelText(/mot de passe/i), 'password123');
    await user.click(screen.getByRole('button', { name: /se connecter/i }));

    expect(await screen.findByLabelText(/code de vérification/i)).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();

    verifyAdminOtpMock.mockResolvedValue(undefined);
    await user.type(screen.getByLabelText(/code de vérification/i), '123456');
    await user.click(screen.getByRole('button', { name: /vérifier/i }));

    await waitFor(() =>
      expect(verifyAdminOtpMock).toHaveBeenCalledWith('admin@exemple.com', '123456', 'device-123'),
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/tracking'));
  });

  it('displays an error message when login fails', async () => {
    loginAdminMock.mockRejectedValue(new Error('Identifiants invalides'));
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/e-mail/i), 'admin@exemple.com');
    await user.type(screen.getByLabelText(/mot de passe/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /se connecter/i }));

    expect(await screen.findByText('Identifiants invalides')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid email before calling the API', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/e-mail/i), 'not-an-email');
    await user.type(screen.getByLabelText(/mot de passe/i), 'password123');
    await user.click(screen.getByRole('button', { name: /se connecter/i }));

    expect(await screen.findByText(/adresse e-mail invalide/i)).toBeInTheDocument();
    expect(loginAdminMock).not.toHaveBeenCalled();
  });
});
