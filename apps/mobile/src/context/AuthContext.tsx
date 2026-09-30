import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AuthSession, Driver, DriverInvitation } from '../types/auth.types';
import { AuthService } from '../services/auth.service';
import { AuthApi } from '../api/auth.api';
import { setForceLogoutHandler } from '../api/client';
import { normalizePhoneNumber, isValidEmail } from '../utils/phone';
import { WebSocketService } from '../services/websocket.service';
import { TrackingService } from '../services/tracking.service';
import { ActiveOwner } from '../database/active-owner';
import { API_BASE_URL } from '../utils/env';

export type AuthStatus = 'unknown' | 'unauthenticated' | 'authenticated';

interface AuthContextType {
  status: AuthStatus;
  driver: Driver | null;
  isLoading: boolean;
  error: string | null;
  notice: string | null;
  /** Connexion normale par identifiant (téléphone ou e-mail) + mot de passe, sans OTP. */
  loginWithPassword: (identifier: string, password: string) => Promise<boolean>;
  /** Lit l'invitation du lien reçu par e-mail ; `null` (et `error` renseigné) si le lien n'est plus valide. */
  loadInvitation: (token: string) => Promise<DriverInvitation | null>;
  /** Active le compte depuis le lien d'invitation (choix du mot de passe) et ouvre la session. */
  activateInvitation: (token: string, password: string) => Promise<boolean>;
  /** Mot de passe oublié : envoie un lien de réinitialisation par e-mail (jamais de code). */
  requestPasswordReset: (email: string) => Promise<boolean>;
  /** Définit le nouveau mot de passe depuis le lien reçu par e-mail. */
  confirmPasswordReset: (token: string, newPassword: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
  clearNotice: () => void;
  restoreSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function firstMessage(err: any): string {
  const rawMessage = err.response?.data?.message;
  return (Array.isArray(rawMessage) ? rawMessage[0] : rawMessage) || '';
}


/**
 * Message d'erreur réseau. L'URL de l'API est FIGÉE À LA COMPILATION (profil `eas.json`) : un APK
 * construit avec une adresse LAN devient injoignable dès que le téléphone quitte ce Wi-Fi, et le
 * chauffeur ne voyait alors qu'un message générique. On affiche donc l'hôte réellement appelé, seul
 * moyen de distinguer « pas de réseau » de « APK pointant vers le mauvais serveur ».
 */
function networkErrorMessage(): string {
  const host = API_BASE_URL.replace(/^https?:\/\//, '').replace(/\/api\/v1\/?$/, '');
  return `Impossible de contacter le serveur (${host}). Vérifiez votre connexion Internet.`;
}

function mapLoginError(err: any): string {
  const status = err.response?.status;
  const messageStr = firstMessage(err);

  // Messages métier déjà en clair côté backend : les relayer tels quels.
  if (messageStr.includes('vérifier votre compte')) return messageStr;
  if (messageStr.includes('Mot de passe oublié')) return messageStr;
  if (messageStr.includes('suspendu')) {
    return 'Votre compte est suspendu. Contactez le coordinateur de votre flotte.';
  }
  if (status === 410) {
    return messageStr || 'Veuillez mettre à jour l’application puis vous reconnecter.';
  }
  if (status === 401 || status === 400) {
    return 'Identifiant ou mot de passe incorrect.';
  }
  if (!err.response) {
    return networkErrorMessage();
  }
  return messageStr || 'Une erreur est survenue. Veuillez réessayer.';
}

function mapResetRequestError(err: any): string {
  const status = err.response?.status;
  const messageStr = firstMessage(err);
  if (status === 503) {
    return 'Le service d’envoi est momentanément indisponible. Veuillez réessayer.';
  }
  if (!err.response) {
    return networkErrorMessage();
  }
  return messageStr || 'Une erreur est survenue. Veuillez réessayer.';
}

/** Erreurs des liens reçus par e-mail : 410 = lien expiré, déjà utilisé ou inconnu (message du backend). */
function mapInvitationError(err: any): string {
  const status = err.response?.status;
  const messageStr = firstMessage(err);
  if (status === 410 || status === 400) {
    return messageStr || 'Ce lien d’activation n’est plus valide. Demandez à votre coordinateur de vous renvoyer l’invitation.';
  }
  if (!err.response) {
    return networkErrorMessage();
  }
  return messageStr || 'Une erreur est survenue. Veuillez réessayer.';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>('unknown');
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);
  const clearNotice = useCallback(() => setNotice(null), []);

  const establishSession = useCallback(async (session: AuthSession) => {
    await AuthService.saveTokens(session.accessToken, session.refreshToken);
    await AuthService.saveDriverProfile(session.driver);
    // Propriétaire des files hors-ligne : posé AVANT tout enregistrement (GPS, validations, pleins).
    ActiveOwner.set(session.driver.id);
    setDriver(session.driver);
    setStatus('authenticated');
    WebSocketService.connect();
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      const refreshToken = await AuthService.getRefreshToken();
      await AuthApi.logout(refreshToken);
    } catch {
      // Ignore network errors
    } finally {
      // Arrêter le suivi AVANT de retirer le propriétaire : le worker GPS ne doit pas survivre à la
      // session qui l'a démarré. Les points déjà en file restent attachés à leur chauffeur.
      try {
        await TrackingService.stopTracking();
      } catch {
        // le suivi peut déjà être arrêté
      }
      ActiveOwner.clear();
      await AuthService.clearTokens();
      WebSocketService.disconnect();
      setDriver(null);
      setNotice(null);
      setStatus('unauthenticated');
      setIsLoading(false);
    }
  }, []);

  const restoreSession = useCallback(async () => {
    try {
      const accessToken = await AuthService.getAccessToken();
      const storedDriver = await AuthService.getDriverProfile();

      if (accessToken && storedDriver) {
        ActiveOwner.set(storedDriver.id);
        setDriver(storedDriver);
        setStatus('authenticated');
        WebSocketService.connect();

        // Refresh profile in background if network is available
        try {
          const freshProfile = await AuthApi.getProfile();
          setDriver(freshProfile);
          await AuthService.saveDriverProfile(freshProfile);
        } catch {
          // Keep stored profile
        }
      } else {
        setStatus('unauthenticated');
      }
    } catch {
      setStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    setForceLogoutHandler(logout);
    restoreSession();
  }, [logout, restoreSession]);

  const loginWithPassword = async (rawIdentifier: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    setNotice(null);
    try {
      const trimmed = rawIdentifier.trim();
      const deviceId = await AuthService.getDeviceId();
      const session = trimmed.includes('@')
        ? await AuthApi.driverLogin({ email: trimmed.toLowerCase(), password, deviceId })
        : await AuthApi.driverLogin({ phone: normalizePhoneNumber(trimmed), password, deviceId });
      await establishSession(session);
      setIsLoading(false);
      return true;
    } catch (err: any) {
      setError(mapLoginError(err));
      setIsLoading(false);
      return false;
    }
  };

  const loadInvitation = async (token: string): Promise<DriverInvitation | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const invitation = await AuthApi.getInvitation(token);
      setIsLoading(false);
      return invitation;
    } catch (err: any) {
      setError(mapInvitationError(err));
      setIsLoading(false);
      return null;
    }
  };

  const activateInvitation = async (token: string, password: string): Promise<boolean> => {
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return false;
    }
    setIsLoading(true);
    setError(null);
    setNotice(null);
    try {
      const deviceId = await AuthService.getDeviceId();
      const session = await AuthApi.activateInvitation({ token, password, deviceId });
      await establishSession(session);
      setIsLoading(false);
      return true;
    } catch (err: any) {
      setError(mapInvitationError(err));
      setIsLoading(false);
      return false;
    }
  };

  const requestPasswordReset = async (target: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    setNotice(null);
    try {
      const normalized = target.trim().toLowerCase();
      if (!isValidEmail(normalized)) {
        setError('Adresse e-mail invalide.');
        setIsLoading(false);
        return false;
      }
      await AuthApi.requestPasswordReset(normalized);
      setNotice('Si un compte existe pour cette adresse, un lien de réinitialisation vient d’être envoyé par e-mail. Ouvrez-le sur ce téléphone.');
      setIsLoading(false);
      return true;
    } catch (err: any) {
      setError(mapResetRequestError(err));
      setIsLoading(false);
      return false;
    }
  };

  const confirmPasswordReset = async (token: string, newPassword: string): Promise<boolean> => {
    if (newPassword.length < 8) {
      setError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return false;
    }
    setIsLoading(true);
    setError(null);
    try {
      await AuthApi.confirmPasswordReset({ token, newPassword });
      await AuthService.clearRememberedCredentials().catch(() => undefined);
      setNotice('Mot de passe réinitialisé. Connectez-vous avec votre nouveau mot de passe.');
      setIsLoading(false);
      return true;
    } catch (err: any) {
      setError(mapInvitationError(err));
      setIsLoading(false);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        status,
        driver,
        isLoading,
        error,
        notice,
        loginWithPassword,
        loadInvitation,
        activateInvitation,
        requestPasswordReset,
        confirmPasswordReset,
        logout,
        clearError,
        clearNotice,
        restoreSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
