import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Driver } from '../types/auth.types';
import { AuthService } from '../services/auth.service';
import { AuthApi } from '../api/auth.api';
import { setForceLogoutHandler } from '../api/client';
import { normalizePhoneNumber } from '../utils/phone';
import { WebSocketService } from '../services/websocket.service';

export type AuthStatus = 'unknown' | 'unauthenticated' | 'otp_requested' | 'authenticated';

interface AuthContextType {
  status: AuthStatus;
  driver: Driver | null;
  phone: string;
  isLoading: boolean;
  error: string | null;
  requestOtp: (rawPhone: string) => Promise<boolean>;
  resendOtp: () => Promise<boolean>;
  verifyOtp: (code: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
  restoreSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>('unknown');
  const [driver, setDriver] = useState<Driver | null>(null);
  const [phone, setPhone] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

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
      setPhone('');
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

  const requestOtp = async (rawPhone: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const normalized = normalizePhoneNumber(rawPhone);
      await AuthApi.requestOtp(normalized, 'WHATSAPP');
      setPhone(normalized);
      setStatus('otp_requested');
      setIsLoading(false);
      return true;
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        (err.response?.status === 404 ? "Ce numéro n'est pas reconnu." : "Échec de l'envoi du code.");
      setError(Array.isArray(message) ? message[0] : message);
      setIsLoading(false);
      return false;
    }
  };

  const resendOtp = async (): Promise<boolean> => {
    if (!phone) return false;
    setIsLoading(true);
    setError(null);
    try {
      await AuthApi.resendOtp(phone);
      setIsLoading(false);
      return true;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Impossible de renvoyer le code pour le moment.';
      setError(Array.isArray(message) ? message[0] : message);
      setIsLoading(false);
      return false;
    }
  };

  const verifyOtp = async (code: string): Promise<boolean> => {
    if (!phone) return false;
    setIsLoading(true);
    setError(null);
    try {
      const deviceId = await AuthService.getDeviceId();
      const session = await AuthApi.verifyOtp({
        phone,
        code,
        deviceId,
      });

      await AuthService.saveTokens(session.accessToken, session.refreshToken);
      await AuthService.saveDriverProfile(session.driver);

      setDriver(session.driver);
      setStatus('authenticated');
      setIsLoading(false);
      WebSocketService.connect();
      return true;
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        (err.response?.status === 401 ? 'Code incorrect ou expiré.' : 'Échec de vérification.');
      setError(Array.isArray(message) ? message[0] : message);
      setIsLoading(false);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        status,
        driver,
        phone,
        isLoading,
        error,
        requestOtp,
        resendOtp,
        verifyOtp,
        logout,
        clearError,
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
