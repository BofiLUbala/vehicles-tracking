import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AuthChannel, AuthMode, Driver, OtpPurpose } from '../types/auth.types';
import { AuthService } from '../services/auth.service';
import { AuthApi } from '../api/auth.api';
import { setForceLogoutHandler } from '../api/client';
import { normalizePhoneNumber, isValidEmail, isValidPhoneNumber } from '../utils/phone';
import { WebSocketService } from '../services/websocket.service';

export type AuthStatus = 'unknown' | 'unauthenticated' | 'otp_requested' | 'authenticated';

interface SignupParams {
  channel: AuthChannel;
  target: string;
  firstName: string;
  lastName: string;
  password: string;
}

interface AuthContextType {
  status: AuthStatus;
  driver: Driver | null;
  mode: AuthMode;
  channel: AuthChannel;
  otpPurpose: OtpPurpose | null;
  identifier: string;
  phone: string;
  email: string;
  firstName: string;
  lastName: string;
  isLoading: boolean;
  error: string | null;
  notice: string | null;
  /** Connexion normale par identifiant (téléphone ou e-mail) + mot de passe, sans OTP. */
  loginWithPassword: (identifier: string, password: string) => Promise<boolean>;
  /** Inscription : demande l'OTP unique d'activation (le mot de passe est gardé en mémoire uniquement). */
  startSignup: (params: SignupParams) => Promise<boolean>;
  /** Vérifie l'OTP d'activation et crée la session. */
  verifySignupOtp: (code: string) => Promise<boolean>;
  /** Mot de passe oublié : demande l'OTP de récupération. */
  startPasswordReset: (channel: AuthChannel, target: string) => Promise<boolean>;
  /** Vérifie l'OTP de récupération et définit le nouveau mot de passe. */
  verifyPasswordReset: (code: string, newPassword: string) => Promise<boolean>;
  resendOtp: () => Promise<boolean>;
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
    return 'Impossible de contacter le serveur. Vérifiez votre connexion Internet.';
  }
  return messageStr || 'Une erreur est survenue. Veuillez réessayer.';
}

function mapOtpError(err: any, channel: AuthChannel): string {
  const status = err.response?.status;
  const messageStr = firstMessage(err);

  if (messageStr.includes('existe déjà')) {
    return 'Un compte existe déjà avec ces informations. Veuillez vous connecter.';
  }
  if (messageStr.includes('désactivé') || messageStr.includes('suspendu')) {
    return 'Votre compte est suspendu. Contactez le coordinateur de votre flotte.';
  }
  if (messageStr.includes('patienter')) {
    return messageStr;
  }
  if (messageStr.includes('8 caractères')) {
    return messageStr;
  }

  if (status === 404) {
    return channel === 'WHATSAPP'
      ? "Aucun compte n'est associé à ce numéro."
      : "Aucun compte n'est associé à cette adresse e-mail.";
  }
  if (status === 401) {
    return 'Le code de vérification est incorrect ou a expiré.';
  }
  if (status === 403) {
    return 'Accès refusé. Compte inactif ou suspendu.';
  }
  if (status === 410) {
    return messageStr || 'Veuillez mettre à jour l’application puis recommencer.';
  }
  if (status === 503) {
    return 'Le service d’envoi est momentanément indisponible. Veuillez réessayer.';
  }
  if (!err.response) {
    return 'Impossible de contacter le serveur. Vérifiez votre connexion Internet.';
  }

  return messageStr || 'Une erreur est survenue. Veuillez réessayer.';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>('unknown');
  const [driver, setDriver] = useState<Driver | null>(null);
  const [mode, setMode] = useState<AuthMode>('SIGN_UP');
  const [channel, setChannel] = useState<AuthChannel>('WHATSAPP');
  const [otpPurpose, setOtpPurpose] = useState<OtpPurpose | null>(null);
  const [identifier, setIdentifier] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  // Mot de passe d'inscription : mémoire vive uniquement, jamais persisté (ni SecureStore, ni disque).
  const [signupPassword, setSignupPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);
  const clearNotice = useCallback(() => setNotice(null), []);

  const establishSession = useCallback(async (session: { accessToken: string; refreshToken: string; driver: Driver }) => {
    await AuthService.saveTokens(session.accessToken, session.refreshToken);
    await AuthService.saveDriverProfile(session.driver);
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
      await AuthService.clearTokens();
      WebSocketService.disconnect();
      setDriver(null);
      setIdentifier('');
      setPhone('');
      setEmail('');
      setFirstName('');
      setLastName('');
      setSignupPassword('');
      setOtpPurpose(null);
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

  const resolveTarget = (selectedChannel: AuthChannel, target: string): { phone?: string; email?: string; normalized: string } | null => {
    const trimmed = target.trim();
    if (selectedChannel === 'WHATSAPP') {
      if (!isValidPhoneNumber(trimmed)) return null;
      const normalized = normalizePhoneNumber(trimmed);
      return { phone: normalized, normalized };
    }
    if (!isValidEmail(trimmed)) return null;
    const normalized = trimmed.toLowerCase();
    return { email: normalized, normalized };
  };

  const startSignup = async (params: SignupParams): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    setNotice(null);
    try {
      const resolved = resolveTarget(params.channel, params.target);
      if (!resolved) {
        setError(params.channel === 'WHATSAPP' ? 'Numéro de téléphone invalide.' : 'Adresse e-mail invalide.');
        setIsLoading(false);
        return false;
      }
      const first = params.firstName.trim();
      const last = params.lastName.trim();
      if (first.length < 2 || last.length < 2) {
        setError('Veuillez saisir votre prénom et votre nom.');
        setIsLoading(false);
        return false;
      }
      if (params.password.length < 8) {
        setError('Le mot de passe doit contenir au moins 8 caractères.');
        setIsLoading(false);
        return false;
      }

      await AuthApi.requestOtp({
        mode: 'SIGN_UP',
        channel: params.channel,
        phone: resolved.phone,
        email: resolved.email,
        firstName: first,
        lastName: last,
      });

      setMode('SIGN_UP');
      setChannel(params.channel);
      setOtpPurpose('signup');
      if (resolved.phone) setPhone(resolved.phone);
      if (resolved.email) setEmail(resolved.email);
      setIdentifier(resolved.normalized);
      setFirstName(first);
      setLastName(last);
      setSignupPassword(params.password);
      setStatus('otp_requested');
      setIsLoading(false);
      return true;
    } catch (err: any) {
      setError(mapOtpError(err, params.channel));
      setIsLoading(false);
      return false;
    }
  };

  const verifySignupOtp = async (code: string): Promise<boolean> => {
    if (!identifier || !signupPassword) return false;
    setIsLoading(true);
    setError(null);
    try {
      const deviceId = await AuthService.getDeviceId();
      const session = await AuthApi.verifyOtp({
        mode: 'SIGN_UP',
        channel,
        phone: channel === 'WHATSAPP' ? phone || identifier : undefined,
        email: channel === 'EMAIL' ? email || identifier : undefined,
        code: code.trim(),
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        password: signupPassword,
        deviceId,
      });

      setSignupPassword('');
      await establishSession(session);
      setOtpPurpose(null);
      setIsLoading(false);
      return true;
    } catch (err: any) {
      setError(mapOtpError(err, channel));
      setIsLoading(false);
      return false;
    }
  };

  const startPasswordReset = async (selectedChannel: AuthChannel, target: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    setNotice(null);
    try {
      const resolved = resolveTarget(selectedChannel, target);
      if (!resolved) {
        setError(selectedChannel === 'WHATSAPP' ? 'Numéro de téléphone invalide.' : 'Adresse e-mail invalide.');
        setIsLoading(false);
        return false;
      }
      await AuthApi.requestPasswordReset({
        channel: selectedChannel,
        phone: resolved.phone,
        email: resolved.email,
      });
      setChannel(selectedChannel);
      setOtpPurpose('recovery');
      if (resolved.phone) setPhone(resolved.phone);
      if (resolved.email) setEmail(resolved.email);
      setIdentifier(resolved.normalized);
      setStatus('otp_requested');
      setIsLoading(false);
      return true;
    } catch (err: any) {
      setError(mapOtpError(err, selectedChannel));
      setIsLoading(false);
      return false;
    }
  };

  const verifyPasswordReset = async (code: string, newPassword: string): Promise<boolean> => {
    if (!identifier) return false;
    setIsLoading(true);
    setError(null);
    try {
      if (newPassword.length < 8) {
        setError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
        setIsLoading(false);
        return false;
      }
      await AuthApi.verifyPasswordReset({
        channel,
        phone: channel === 'WHATSAPP' ? phone || identifier : undefined,
        email: channel === 'EMAIL' ? email || identifier : undefined,
        code: code.trim(),
        newPassword,
      });
      setOtpPurpose(null);
      setStatus('unauthenticated');
      setNotice('Mot de passe réinitialisé. Connectez-vous avec votre nouveau mot de passe.');
      setIsLoading(false);
      return true;
    } catch (err: any) {
      setError(mapOtpError(err, channel));
      setIsLoading(false);
      return false;
    }
  };

  const resendOtp = async (): Promise<boolean> => {
    if (!identifier) return false;
    setIsLoading(true);
    setError(null);
    try {
      if (otpPurpose === 'recovery') {
        // Les codes de récupération sont cloisonnés sous un mode dédié : réémettre via
        // le endpoint de récupération (même cooldown anti-spam).
        await AuthApi.requestPasswordReset({
          channel,
          phone: channel === 'WHATSAPP' ? phone || identifier : undefined,
          email: channel === 'EMAIL' ? email || identifier : undefined,
        });
      } else {
        await AuthApi.resendOtp({
          mode: 'SIGN_UP',
          channel,
          phone: channel === 'WHATSAPP' ? phone || identifier : undefined,
          email: channel === 'EMAIL' ? email || identifier : undefined,
        });
      }
      setIsLoading(false);
      return true;
    } catch (err: any) {
      setError(mapOtpError(err, channel));
      setIsLoading(false);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        status,
        driver,
        mode,
        channel,
        otpPurpose,
        identifier,
        phone,
        email,
        firstName,
        lastName,
        isLoading,
        error,
        notice,
        loginWithPassword,
        startSignup,
        verifySignupOtp,
        startPasswordReset,
        verifyPasswordReset,
        resendOtp,
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
