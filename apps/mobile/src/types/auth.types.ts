export type RoleName = 'DRIVER' | 'ADMIN' | 'SUPER_ADMIN';

export type DriverStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'UNAVAILABLE' | 'DISABLED';

export type AuthMode = 'LOGIN' | 'SIGN_UP';

/** Usage OTP côté mobile : activation de compte ou récupération de mot de passe uniquement. */
export type OtpPurpose = 'signup' | 'recovery';

export type AuthChannel = 'WHATSAPP' | 'EMAIL';

export interface Driver {
  id: string;
  organizationId: string;
  organizationName?: string | null;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  licenseNumber?: string | null;
  status: DriverStatus;
  currentVehicleId?: string | null;
  currentVehiclePlate?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthSession extends AuthTokens {
  driver: Driver;
}

export interface RequestOtpDto {
  mode?: AuthMode;
  channel: AuthChannel;
  phone?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  deviceId?: string;
}

export interface VerifyOtpDto {
  mode?: AuthMode;
  channel: AuthChannel;
  phone?: string;
  email?: string;
  code: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  deviceId?: string;
}

export interface DriverLoginDto {
  phone?: string;
  email?: string;
  password: string;
  deviceId?: string;
}

export interface RequestPasswordResetDto {
  channel: AuthChannel;
  phone?: string;
  email?: string;
}

export interface VerifyPasswordResetDto extends RequestPasswordResetDto {
  code: string;
  newPassword: string;
}

export interface ResendOtpDto {
  mode?: AuthMode;
  channel: AuthChannel;
  phone?: string;
  email?: string;
  deviceId?: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface AuthProfileResponse {
  driver: Driver;
}

