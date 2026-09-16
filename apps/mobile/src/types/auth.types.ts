export type RoleName = 'DRIVER' | 'ADMIN' | 'SUPER_ADMIN';

export type DriverStatus = 'ACTIVE' | 'SUSPENDED' | 'UNAVAILABLE' | 'DISABLED';

export interface Driver {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  phone: string;
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
  phone: string;
  channel?: 'WHATSAPP' | 'EMAIL';
}

export interface VerifyOtpDto {
  phone: string;
  code: string;
  deviceId?: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface AuthProfileResponse {
  driver: Driver;
}
