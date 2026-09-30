import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, GoneException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OtpChannel } from '@prisma/client';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { RedisOtpStore } from './redis-otp-store.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeEventsService } from '../tracking/realtime-events.service';
import { OTP_SENDER_EMAIL } from './ports/otp-sender.port';
import { SmtpEmailSender } from './senders/smtp-email.sender';
import { hashDriverLinkToken } from '../drivers/driver-link-token';

jest.setTimeout(30000);

describe('AuthService - chauffeurs par liens e-mail, admins par code', () => {
  let service: AuthService;
  let otpStore: RedisOtpStore;
  let prisma: PrismaService;

  const mockEmailSender = {
    channel: OtpChannel.EMAIL,
    send: jest.fn().mockResolvedValue(undefined),
  };

  // Liens chauffeur par e-mail (invitation, mot de passe oublié) : jamais de code.
  const mockDriverEmails = {
    sendDriverInvitation: jest.fn().mockResolvedValue(undefined),
    sendDriverPasswordReset: jest.fn().mockResolvedValue(undefined),
  };

  // In-memory mock store for redis
  const memoryStore = new Map<string, string>();

  const mockRedisClient = {
    status: 'ready',
    get: jest.fn((key: string) => Promise.resolve(memoryStore.get(key) || null)),
    set: jest.fn((key: string, val: string) => {
      memoryStore.set(key, val);
      return Promise.resolve('OK');
    }),
    del: jest.fn((key: string) => {
      memoryStore.delete(key);
      return Promise.resolve(1);
    }),
    disconnect: jest.fn(),
    on: jest.fn(),
  };

  const mockPrisma = {
    driver: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    organization: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    device: {
      upsert: jest.fn().mockResolvedValue({}),
    },
    otpRequest: {
      create: jest.fn().mockResolvedValue({ id: 'otp-1' }),
      delete: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({}),
    },
    userSession: {
      create: jest.fn().mockResolvedValue({ id: 'sess-1' }),
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };

  beforeEach(async () => {
    memoryStore.clear();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        RedisOtpStore,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'JWT_ACCESS_SECRET') return 'test-access-secret';
              if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret';
              if (key === 'JWT_ACCESS_EXPIRES_IN') return '15m';
              if (key === 'JWT_REFRESH_EXPIRES_IN') return '30d';
              if (key === 'OTP_DEV_EXPOSE_CODE') return 'true';
              if (key === 'NODE_ENV') return 'test';
              return null;
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('test-jwt-token'),
            signAsync: jest.fn().mockResolvedValue('test-jwt-token'),
            verify: jest.fn(),
          },
        },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SmtpEmailSender, useValue: mockDriverEmails },
        { provide: OTP_SENDER_EMAIL, useValue: mockEmailSender },
        { provide: RealtimeEventsService, useValue: { emitDriverRegistered: jest.fn(), emitDriverChanged: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    otpStore = module.get<RedisOtpStore>(RedisOtpStore);
    prisma = module.get<PrismaService>(PrismaService);

    // Patch internal client of RedisOtpStore to use our mock
    (otpStore as any).client = mockRedisClient;
  });

  describe('1. Connexion chauffeur par mot de passe (aucun code)', () => {
    it('driverLogin succeeds with password and creates no OTP request', async () => {
      const passwordHash = await argon2.hash('DriverPass123');
      mockPrisma.driver.findFirst.mockResolvedValueOnce({
        id: 'driver-123',
        organizationId: 'org-1',
        firstName: 'Gauthier',
        lastName: 'Bofi',
        email: 'driver@company.cd',
        phone: '+243989805614',
        status: 'ACTIVE',
        passwordHash,
        deletedAt: null,
      });

      const session = await service.driverLogin({ phone: '+243989805614', password: 'DriverPass123' });

      expect(session.accessToken).toBe('test-jwt-token');
      expect(session.driver.firstName).toBe('Gauthier');
      expect(mockPrisma.otpRequest.create).not.toHaveBeenCalled();
    });

    it('driverLogin rejects wrong password without oracle', async () => {
      const passwordHash = await argon2.hash('DriverPass123');
      mockPrisma.driver.findFirst.mockResolvedValueOnce({
        id: 'driver-123',
        organizationId: 'org-1',
        status: 'ACTIVE',
        passwordHash,
        deletedAt: null,
      });
      await expect(service.driverLogin({ phone: '+243989805614', password: 'Nope12345' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('driverLogin rejects unverified account with activation message', async () => {
      mockPrisma.driver.findFirst.mockResolvedValueOnce({
        id: 'driver-pending',
        organizationId: 'org-1',
        status: 'PENDING_VERIFICATION',
        passwordHash: await argon2.hash('DriverPass123'),
        deletedAt: null,
      });
      const err = await service.driverLogin({ phone: '+243989805614', password: 'DriverPass123' }).catch((e) => e);
      expect(err).toBeInstanceOf(ForbiddenException);
      expect(err.message).toContain('vérifier votre compte');
    });

    it('driverLogin rejects active account without password, pointing to the coordinator', async () => {
      mockPrisma.driver.findFirst.mockResolvedValueOnce({
        id: 'driver-legacy',
        organizationId: 'org-1',
        status: 'ACTIVE',
        passwordHash: null,
        deletedAt: null,
      });
      const err = await service.driverLogin({ phone: '+243989805614', password: 'Whatever123' }).catch((e) => e);
      expect(err).toBeInstanceOf(ForbiddenException);
      expect(err.message).toContain('renvoyer l’invitation');
    });
  });

  describe('2. Mot de passe oublié chauffeur : lien par e-mail, aucun code', () => {
    const active = {
      id: 'd-1',
      organizationId: 'org-1',
      firstName: 'Jean',
      email: 'driver@company.cd',
      status: 'ACTIVE',
      deletedAt: null,
      passwordHash: 'old-hash',
    };

    it("envoie un lien (jamais un code) et ne stocke que le hash du jeton", async () => {
      mockPrisma.driver.findFirst.mockResolvedValueOnce(active);
      const req = await service.requestDriverPasswordReset({ email: 'Driver@Company.cd' });

      expect(req.message).toContain('lien');
      expect(mockEmailSender.send).not.toHaveBeenCalled();
      expect(mockPrisma.otpRequest.create).not.toHaveBeenCalled();
      const token = mockDriverEmails.sendDriverPasswordReset.mock.calls[0][2];
      expect(mockDriverEmails.sendDriverPasswordReset).toHaveBeenCalledWith('driver@company.cd', 'Jean', token);
      expect(mockPrisma.driver.update).toHaveBeenCalledWith({
        where: { id: 'd-1' },
        data: { passwordResetTokenHash: hashDriverLinkToken(token), passwordResetExpiresAt: expect.any(Date) },
      });
    });

    it('reste générique et n’envoie rien pour un compte inconnu', async () => {
      mockPrisma.driver.findFirst.mockResolvedValueOnce(null);
      const req = await service.requestDriverPasswordReset({ email: 'inconnu@company.cd' });
      expect(req.message).toBeDefined();
      expect(mockDriverEmails.sendDriverPasswordReset).not.toHaveBeenCalled();
    });

    it('définit le nouveau mot de passe, consomme le jeton et ferme les sessions', async () => {
      const token = 'reset-token-0123456789abcdef';
      mockPrisma.driver.findUnique.mockResolvedValueOnce({
        ...active,
        passwordResetTokenHash: hashDriverLinkToken(token),
        passwordResetExpiresAt: new Date(Date.now() + 60_000),
      });
      mockPrisma.driver.updateMany.mockResolvedValueOnce({ count: 1 });

      await service.confirmDriverPasswordReset({ token, newPassword: 'NewPass123' });

      const { where, data } = mockPrisma.driver.updateMany.mock.calls[0][0];
      expect(where).toEqual({ id: 'd-1', passwordResetTokenHash: hashDriverLinkToken(token) });
      expect(data.passwordResetTokenHash).toBeNull();
      expect(await argon2.verify(data.passwordHash, 'NewPass123')).toBe(true);
      expect(mockPrisma.userSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ driverId: 'd-1' }) }),
      );
    });

    it('refuse un lien expiré (410)', async () => {
      const token = 'reset-token-0123456789abcdef';
      mockPrisma.driver.findUnique.mockResolvedValueOnce({
        ...active,
        passwordResetTokenHash: hashDriverLinkToken(token),
        passwordResetExpiresAt: new Date(Date.now() - 1000),
      });
      await expect(service.confirmDriverPasswordReset({ token, newPassword: 'NewPass123' })).rejects.toThrow(GoneException);
      expect(mockPrisma.driver.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('3. Comptes admin : récupération par code e-mail uniquement', () => {
    it("n'envoie un code qu'à un compte admin, jamais à un chauffeur", async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(null);
      const req = await service.requestPasswordReset({ channel: OtpChannel.EMAIL, email: 'driver@company.cd' });
      expect(req.message).toBeDefined();
      expect((req as any).devCode).toBeUndefined();
      expect(mockEmailSender.send).not.toHaveBeenCalled();
      expect(mockPrisma.driver.findFirst).not.toHaveBeenCalled();
    });

    it('réinitialise le mot de passe admin avec le bon code et ferme ses sessions', async () => {
      const admin = { id: 'u-1', email: 'admin@company.cd', isActive: true, deletedAt: null };
      mockPrisma.user.findFirst.mockResolvedValue(admin);
      const req = await service.requestPasswordReset({ channel: OtpChannel.EMAIL, email: 'admin@company.cd' });
      const code = (req as any).devCode;
      expect(code).toMatch(/^\d{6}$/);

      await service.verifyPasswordReset({ channel: OtpChannel.EMAIL, email: 'admin@company.cd', code, newPassword: 'NewPass123' });
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'u-1' }, data: { passwordHash: expect.any(String) } }),
      );
      expect(mockPrisma.userSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: 'u-1' }) }),
      );
    });

    it('bloque la redemande de code pendant le délai anti-spam', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'u-1', email: 'admin@company.cd', isActive: true, deletedAt: null });
      await service.requestPasswordReset({ channel: OtpChannel.EMAIL, email: 'admin@company.cd' });
      await expect(
        service.requestPasswordReset({ channel: OtpChannel.EMAIL, email: 'admin@company.cd' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('4. Refresh sans code', () => {
    it('refresh creates no OTP request', async () => {
      const jwt = (service as any).jwt;
      jwt.verify.mockReturnValueOnce({ sessionId: 'sess-1', secret: 's3cr3t' });
      mockPrisma.userSession.findUnique.mockResolvedValueOnce({
        id: 'sess-1',
        refreshTokenHash: await argon2.hash('s3cr3t'),
        family: 'fam-1',
        expiresAt: new Date(Date.now() + 3600_000),
        revokedAt: null,
        driverId: 'driver-1',
        userId: null,
        deviceId: null,
      });
      mockPrisma.driver.findUnique.mockResolvedValueOnce({
        id: 'driver-1',
        organizationId: 'org-1',
        status: 'ACTIVE',
        deletedAt: null,
      });

      const rotated = await service.refresh({ refreshToken: 'presented-refresh-token' });
      expect(rotated.accessToken).toBe('test-jwt-token');
      expect(mockPrisma.otpRequest.create).not.toHaveBeenCalled();
    });
  });

  describe("5. Activation par le lien d'invitation e-mail", () => {
    const token = 'invitation-token-0123456789abcdef';
    const invited = {
      id: 'drv-inv',
      organizationId: 'org-1',
      firstName: 'Jean',
      lastName: 'Mputu',
      phone: '+243999000111',
      email: 'jean@company.cd',
      status: 'ACTIVE',
      passwordHash: null,
      deletedAt: null,
      invitationTokenHash: hashDriverLinkToken(token),
      invitationExpiresAt: new Date(Date.now() + 60_000),
    };

    it("retrouve l'invitation par le hash du jeton, jamais par le jeton en clair", async () => {
      mockPrisma.driver.findUnique.mockResolvedValue(invited);
      await expect(service.getDriverInvitation({ token })).resolves.toEqual({
        firstName: 'Jean', lastName: 'Mputu', email: 'jean@company.cd', phone: '+243999000111',
      });
      expect(mockPrisma.driver.findUnique).toHaveBeenCalledWith({ where: { invitationTokenHash: hashDriverLinkToken(token) } });
    });

    it('refuse un lien expiré ou déjà utilisé (410)', async () => {
      mockPrisma.driver.findUnique.mockResolvedValueOnce({ ...invited, invitationExpiresAt: new Date(Date.now() - 1000) });
      await expect(service.getDriverInvitation({ token })).rejects.toThrow(GoneException);
      mockPrisma.driver.findUnique.mockResolvedValueOnce({ ...invited, passwordHash: 'hash' });
      await expect(service.activateDriver({ token, password: 'motdepasse1' })).rejects.toThrow(GoneException);
      mockPrisma.driver.findUnique.mockResolvedValueOnce(null);
      await expect(service.activateDriver({ token, password: 'motdepasse1' })).rejects.toThrow(GoneException);
      expect(mockPrisma.driver.updateMany).not.toHaveBeenCalled();
    });

    it('définit le mot de passe, consomme le jeton et ouvre la session', async () => {
      mockPrisma.driver.findUnique.mockResolvedValue(invited);
      mockPrisma.driver.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.driver.findUniqueOrThrow.mockResolvedValue({ ...invited, passwordHash: 'hash', invitationTokenHash: null });

      const session = await service.activateDriver({ token, password: 'motdepasse1', deviceId: 'dev-1' });

      const { where, data } = mockPrisma.driver.updateMany.mock.calls[0][0];
      expect(where).toEqual({ id: 'drv-inv', invitationTokenHash: invited.invitationTokenHash, passwordHash: null });
      expect(data.invitationTokenHash).toBeNull();
      expect(data.invitationExpiresAt).toBeNull();
      expect(await argon2.verify(data.passwordHash, 'motdepasse1')).toBe(true);
      expect(session.accessToken).toBe('test-jwt-token');
      expect(session.driver.id).toBe('drv-inv');
      expect(mockPrisma.device.upsert).toHaveBeenCalled();
      expect(mockPrisma.otpRequest.create).not.toHaveBeenCalled();
    });

    it('un second clic concurrent sur le même lien est refusé', async () => {
      mockPrisma.driver.findUnique.mockResolvedValue(invited);
      mockPrisma.driver.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.activateDriver({ token, password: 'motdepasse1' })).rejects.toThrow(GoneException);
    });

    it("la connexion d'un chauffeur invité non activé renvoie vers le lien e-mail", async () => {
      mockPrisma.driver.findFirst.mockResolvedValue(invited);
      await expect(service.driverLogin({ email: 'jean@company.cd', password: 'x' })).rejects.toThrow(/lien d’activation/);
    });
  });
});
