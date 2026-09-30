export type RoleName = 'DRIVER' | 'ADMIN' | 'SUPER_ADMIN';

export type DriverStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'UNAVAILABLE' | 'DISABLED';

export interface Driver {
  type?: 'driver';
  role?: RoleName;
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

export interface DriverInvitation {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
}

export interface ActivateInvitationDto {
  token: string;
  password: string;
  deviceId?: string;
}

export interface DriverLoginDto {
  phone?: string;
  email?: string;
  password: string;
  deviceId?: string;
}

/** Nouveau mot de passe choisi depuis le lien « Mot de passe oublié » reçu par e-mail. */
export interface ConfirmPasswordResetDto {
  token: string;
  newPassword: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface AuthProfileResponse {
  driver: Driver;
}
