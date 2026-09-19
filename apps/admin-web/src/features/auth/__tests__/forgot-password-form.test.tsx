import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => new URLSearchParams(),
}));

const requestPasswordResetMock = vi.fn();
const verifyPasswordResetMock = vi.fn();

vi.mock('@/features/auth/api', () => ({
  requestPasswordReset: (...args: unknown[]) => requestPasswordResetMock(...args),
  verifyPasswordReset: (...args: unknown[]) => verifyPasswordResetMock(...args),
}));

import { ForgotPasswordForm } from '@/features/auth/forgot-password-form';

describe('ForgotPasswordForm', () => {
  beforeEach(() => {
    pushMock.mockReset();
    requestPasswordResetMock.mockReset();
    verifyPasswordResetMock.mockReset();
  });

  it('requests a recovery code then resets the password', async () => {
    requestPasswordResetMock.mockResolvedValue({ message: 'ok' });
    verifyPasswordResetMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText(/e-mail/i), 'admin@exemple.com');
    await user.click(screen.getByRole('button', { name: /recevoir le code/i }));

    await waitFor(() => expect(requestPasswordResetMock).toHaveBeenCalledWith('admin@exemple.com'));
    expect(await screen.findByLabelText(/code de récupération/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/code de récupération/i), '123456');
    await user.type(screen.getByLabelText(/^nouveau mot de passe/i), 'NewPassw0rd1');
    await user.type(screen.getByLabelText(/confirmer le mot de passe/i), 'NewPassw0rd1');
    await user.click(screen.getByRole('button', { name: /réinitialiser le mot de passe/i }));

    await waitFor(() =>
      expect(verifyPasswordResetMock).toHaveBeenCalledWith('admin@exemple.com', '123456', 'NewPassw0rd1'),
    );
    expect(await screen.findByText(/mot de passe a été réinitialisé/i)).toBeInTheDocument();
  });

  it('rejects mismatched passwords before calling the API', async () => {
    requestPasswordResetMock.mockResolvedValue({ message: 'ok' });
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText(/e-mail/i), 'admin@exemple.com');
    await user.click(screen.getByRole('button', { name: /recevoir le code/i }));
    expect(await screen.findByLabelText(/code de récupération/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/code de récupération/i), '123456');
    await user.type(screen.getByLabelText(/^nouveau mot de passe/i), 'NewPassw0rd1');
    await user.type(screen.getByLabelText(/confirmer le mot de passe/i), 'Different1');
    await user.click(screen.getByRole('button', { name: /réinitialiser le mot de passe/i }));

    expect(await screen.findByText(/ne correspondent pas/i)).toBeInTheDocument();
    expect(verifyPasswordResetMock).not.toHaveBeenCalled();
  });
});
