import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, GoneException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OtpChannel } from '@prisma/client';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { RedisOtpStore } from './redis-otp-store.service';
import { PrismaService } from '../prisma/prisma.service';
import { OTP_SENDER_EMAIL, OTP_SENDER_WHATSAPP } from './ports/otp-sender.port';
import { AuthMode } from './dto/request-otp.dto';

jest.setTimeout(30000);

describe('AuthService - Multi-Channel & Multi-Mode Security Suite', () => {
  let service: AuthService;
  let otpStore: RedisOtpStore;
  let prisma: PrismaService;

  const mockWhatsappSender = {
    channel: OtpChannel.WHATSAPP,
    send: jest.fn().mockResolvedValue(undefined),
  };

  const mockEmailSender = {
    channel: OtpChannel.EMAIL,
    send: jest.fn().mockResolvedValue(undefined),
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
        { provide: OTP_SENDER_WHATSAPP, useValue: mockWhatsappSender },
        { provide: OTP_SENDER_EMAIL, useValue: mockEmailSender },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    otpStore = module.get<RedisOtpStore>(RedisOtpStore);
    prisma = module.get<PrismaService>(PrismaService);

    // Patch internal client of RedisOtpStore to use our mock
    (otpStore as any).client = mockRedisClient;
  });

  describe("1. L'OTP n'est plus un moyen de connexion (LOGIN désactivé)", () => {
    it('requestOtp en LOGIN répond 410 Gone sans envoyer de code', async () => {
      await expect(
        service.requestOtp({ mode: AuthMode.LOGIN, channel: OtpChannel.WHATSAPP, phone: '+243989805614' }),
      ).rejects.toThrow(GoneException);
      expect(mockWhatsappSender.send).not.toHaveBeenCalled();
    });

    it('verifyOtp en LOGIN répond 410 Gone', async () => {
      await expect(
        service.verifyOtp({ mode: AuthMode.LOGIN, channel: OtpChannel.WHATSAPP, phone: '+243989805614', code: '123456' }),
      ).rejects.toThrow(GoneException);
    });

    it('resendOtp en LOGIN répond 410 Gone', async () => {
      await expect(
        service.resendOtp({ mode: AuthMode.LOGIN, channel: OtpChannel.EMAIL, email: 'driver@company.cd' }),
      ).rejects.toThrow(GoneException);
    });
  });

  describe("2. Activation SIGN_UP : routage WhatsApp / Email", () => {
    it("demande l'OTP d'activation via WhatsApp", async () => {
      mockPrisma.driver.findFirst.mockResolvedValueOnce(null);
      const res = await service.requestOtp({
        mode: AuthMode.SIGN_UP,
        channel: OtpChannel.WHATSAPP,
        phone: '+243989805614',
      });

      expect(mockWhatsappSender.send).toHaveBeenCalledWith('+243989805614', expect.any(String));
      expect(mockEmailSender.send).not.toHaveBeenCalled();
      expect(res.message).toContain('valid');
    });

    it("demande l'OTP d'activation via Email", async () => {
      mockPrisma.driver.findFirst.mockResolvedValueOnce(null);
      const res = await service.requestOtp({
        mode: AuthMode.SIGN_UP,
        channel: OtpChannel.EMAIL,
        email: 'driver@company.cd',
      });

      expect(mockEmailSender.send).toHaveBeenCalledWith('driver@company.cd', expect.any(String));
      expect(mockWhatsappSender.send).not.toHaveBeenCalled();
      expect(res.message).toContain('valid');
    });

    it('rejects duplicate SIGN_UP if active driver already exists with that phone', async () => {
      mockPrisma.driver.findFirst.mockResolvedValueOnce({
        id: 'd-1',
        phone: '+243989805614',
        status: 'ACTIVE',
      });

      await expect(
        service.requestOtp({
          mode: AuthMode.SIGN_UP,
          channel: OtpChannel.WHATSAPP,
          phone: '+243989805614',
          firstName: 'Gauthier',
          lastName: 'Bofi',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects duplicate SIGN_UP if active driver already exists with that email', async () => {
      mockPrisma.driver.findFirst.mockResolvedValueOnce({
        id: 'd-1',
        email: 'driver@company.cd',
        status: 'ACTIVE',
      });

      await expect(
        service.requestOtp({
          mode: AuthMode.SIGN_UP,
          channel: OtpChannel.EMAIL,
          email: 'driver@company.cd',
          firstName: 'Gauthier',
          lastName: 'Bofi',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('3. Isolation canal / identifiant (attaques inter-canaux)', () => {
    it('ATTACK: OTP requested for EMAIL cannot be verified via WHATSAPP with same code', async () => {
      mockPrisma.driver.findFirst.mockResolvedValue(null);
      const email = 'victim@example.com';
      const req = await service.requestOtp({
        mode: AuthMode.SIGN_UP,
        channel: OtpChannel.EMAIL,
        email,
      });

      const issuedCode = (req as any).devCode;
      expect(issuedCode).toBeDefined();

      // Attacker attempts to verify via WhatsApp with same code
      await expect(
        service.verifyOtp({
          mode: AuthMode.SIGN_UP,
          channel: OtpChannel.WHATSAPP,
          phone: '+243989805614',
          code: issuedCode,
          password: 'AttackPass123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('ATTACK: OTP requested for userA@example.com cannot be verified for userB@example.com', async () => {
      mockPrisma.driver.findFirst.mockResolvedValue(null);
      const req = await service.requestOtp({
        mode: AuthMode.SIGN_UP,
        channel: OtpChannel.EMAIL,
        email: 'usera@example.com',
      });

      const issuedCode = (req as any).devCode;

      await expect(
        service.verifyOtp({
          mode: AuthMode.SIGN_UP,
          channel: OtpChannel.EMAIL,
          email: 'userb@example.com',
          code: issuedCode,
          password: 'AttackPass123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('ATTACK: OTP requested for WHATSAPP phone A cannot be verified for WHATSAPP phone B', async () => {
      mockPrisma.driver.findFirst.mockResolvedValue(null);
      const req = await service.requestOtp({
        mode: AuthMode.SIGN_UP,
        channel: OtpChannel.WHATSAPP,
        phone: '+243989805614',
      });

      const issuedCode = (req as any).devCode;

      await expect(
        service.verifyOtp({
          mode: AuthMode.SIGN_UP,
          channel: OtpChannel.WHATSAPP,
          phone: '+243812345678',
          code: issuedCode,
          password: 'AttackPass123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("4. Activation réussie + connexion par mot de passe (sans OTP)", () => {
    it('verifies Email SIGN_UP, hashes password and registers new driver in organization', async () => {
      const email = 'newdriver@company.cd';
      mockPrisma.organization.findFirst.mockResolvedValueOnce({ id: 'org-1', name: 'Régie Kinshasa' });
      mockPrisma.driver.findFirst.mockResolvedValueOnce(null); // requestOtp: not existing yet
      mockPrisma.driver.findFirst.mockResolvedValueOnce(null); // verifyOtp: not existing yet
      mockPrisma.driver.create.mockResolvedValueOnce({
        id: 'driver-new',
        organizationId: 'org-1',
        firstName: 'Gauthier',
        lastName: 'Mukendi',
        email,
        phone: null,
        status: 'ACTIVE',
      });

      const req = await service.requestOtp({
        mode: AuthMode.SIGN_UP,
        channel: OtpChannel.EMAIL,
        email,
        firstName: 'Gauthier',
        lastName: 'Mukendi',
      });

      const code = (req as any).devCode;

      const session = await service.verifyOtp({
        mode: AuthMode.SIGN_UP,
        channel: OtpChannel.EMAIL,
        email,
        code,
        password: 'SignupPass123',
        firstName: 'Gauthier',
        lastName: 'Mukendi',
      });

      expect(mockPrisma.driver.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email, status: 'ACTIVE', passwordHash: expect.any(String) }),
        }),
      );
      expect(session.driver.id).toBe('driver-new');
      expect(session.driver.email).toBe(email);
    });

    it('rejects SIGN_UP verification without password', async () => {
      const email = 'nopass@company.cd';
      mockPrisma.driver.findFirst.mockResolvedValue(null);
      const req = await service.requestOtp({ mode: AuthMode.SIGN_UP, channel: OtpChannel.EMAIL, email });
      const code = (req as any).devCode;
      await expect(
        service.verifyOtp({ mode: AuthMode.SIGN_UP, channel: OtpChannel.EMAIL, email, code }),
      ).rejects.toThrow(BadRequestException);
    });

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

    it('driverLogin rejects active account without password, pointing to recovery', async () => {
      mockPrisma.driver.findFirst.mockResolvedValueOnce({
        id: 'driver-legacy',
        organizationId: 'org-1',
        status: 'ACTIVE',
        passwordHash: null,
        deletedAt: null,
      });
      const err = await service.driverLogin({ phone: '+243989805614', password: 'Whatever123' }).catch((e) => e);
      expect(err).toBeInstanceOf(ForbiddenException);
      expect(err.message).toContain('Mot de passe oublié');
    });
  });

  describe('5. Récupération par OTP + refresh sans OTP', () => {
    it('password reset sets hash, revokes sessions, then login works', async () => {
      const phone = '+243989805614';
      mockPrisma.driver.findFirst
        .mockResolvedValueOnce({ id: 'd-1', status: 'ACTIVE', deletedAt: null })
        .mockResolvedValueOnce({ id: 'd-1', status: 'ACTIVE', deletedAt: null });

      const req = await service.requestPasswordReset({ channel: OtpChannel.WHATSAPP, phone });
      expect(req.message).toBeDefined();
      const code = (req as any).devCode;
      expect(code).toMatch(/^\d{6}$/);

      const res = await service.verifyPasswordReset({ channel: OtpChannel.WHATSAPP, phone, code, newPassword: 'NewPass123' });
      expect(res.message).toBeDefined();
      expect(mockPrisma.driver.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ passwordHash: expect.any(String) }) }),
      );
      expect(mockPrisma.userSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ driverId: 'd-1' }) }),
      );
    });

    it('password reset request stays generic for unknown accounts', async () => {
      mockPrisma.driver.findFirst.mockResolvedValue(null);
      const req = await service.requestPasswordReset({ channel: OtpChannel.WHATSAPP, phone: '+243800000000' });
      expect(req.message).toBeDefined();
      expect((req as any).devCode).toBeUndefined();
      expect(mockWhatsappSender.send).not.toHaveBeenCalled();
    });

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

  describe('6. Rate Limiting & Cooldown', () => {
    it('prevents resend within 60 seconds cooldown', async () => {
      mockPrisma.driver.findFirst.mockResolvedValue(null);
      await service.requestOtp({
        mode: AuthMode.SIGN_UP,
        channel: OtpChannel.EMAIL,
        email: 'test@example.com',
      });

      await expect(
        service.requestOtp({
          mode: AuthMode.SIGN_UP,
          channel: OtpChannel.EMAIL,
          email: 'test@example.com',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
