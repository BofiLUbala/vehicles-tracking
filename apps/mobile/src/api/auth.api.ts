import { apiClient } from './client';
import {
  ActivateInvitationDto,
  AuthSession,
  Driver,
  DriverInvitation,
  ConfirmPasswordResetDto,
  DriverLoginDto,
} from '../types/auth.types';

/**
 * Les endpoints qui déclenchent un envoi d'e-mail attendent la réponse SMTP côté backend
 * (jusqu'à `SMTP_SEND_TIMEOUT_MS`, 30 s par défaut). Avec le délai global de 20 s, une livraison un
 * peu lente était rapportée comme « Impossible de contacter le serveur » alors que l'API répondait
 * normalement (défaut constaté en conditions réelles). Ce délai doit rester SUPÉRIEUR au budget
 * d'envoi du backend.
 */
const EMAIL_SEND_TIMEOUT_MS = 45_000;

export const AuthApi = {
  /** Invitation associée au lien d'activation reçu par e-mail (nom du chauffeur à afficher). */
  async getInvitation(token: string): Promise<DriverInvitation> {
    const response = await apiClient.post<DriverInvitation>('/auth/driver/invitation', { token });
    return response.data;
  },

  /** Activation du compte depuis le lien d'invitation : le chauffeur choisit son mot de passe. */
  async activateInvitation(dto: ActivateInvitationDto): Promise<AuthSession> {
    const response = await apiClient.post<AuthSession>('/auth/driver/activate', dto);
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

  /** Mot de passe oublié : un lien de réinitialisation est envoyé par e-mail (jamais de code). */
  async requestPasswordReset(email: string): Promise<void> {
    await apiClient.post('/auth/driver/password-reset/request', { email }, { timeout: EMAIL_SEND_TIMEOUT_MS });
  },

  /** Nouveau mot de passe depuis le lien de réinitialisation. */
  async confirmPasswordReset(dto: ConfirmPasswordResetDto): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/auth/driver/password-reset/confirm', dto);
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
