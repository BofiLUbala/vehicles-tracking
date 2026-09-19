import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { BadRequestException, ForbiddenException, GoneException, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import * as argon2 from 'argon2';
import { OtpChannel } from '@prisma/client';
import { AuthModule } from './auth.module';
import { AuthService } from './auth.service';
import { AuthMode } from './dto/request-otp.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { StubWhatsappSender } from './senders/stub-whatsapp.sender';

const DEMO_ORG_ID = '00000000-0000-0000-0000-000000000001';
const SIGNUP_PASSWORD = 'SignupPass123';

jest.setTimeout(30000);

describe('AuthService (intégration, DB + Redis réels)', () => {
  let auth: AuthService;
  let prisma: PrismaService;
  let stubSender: StubWhatsappSender;
  let testPhone: string;
  let moduleRef: any;

  const driverIds: string[] = [];

  async function createActiveDriver(phone: string, password?: string) {
    const driver = await prisma.driver.create({
      data: {
        organizationId: DEMO_ORG_ID,
        firstName: 'Test',
        lastName: 'Chauffeur',
        phone,
        status: 'ACTIVE',
        ...(password ? { passwordHash: await argon2.hash(password) } : {}),
      },
    });
    driverIds.push(driver.id);
    return driver;
  }

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule],
    }).compile();

    auth = moduleRef.get(AuthService);
    prisma = moduleRef.get(PrismaService);
    stubSender = moduleRef.get(StubWhatsappSender);
  });

  beforeEach(async () => {
    testPhone = `+2439${Math.floor(10000000 + Math.random() * 89999999)}`;
  });

  afterEach(async () => {
    await prisma.driver.deleteMany({ where: { id: { in: driverIds } } }).catch(() => undefined);
    driverIds.length = 0;
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  describe('activation par OTP (SIGN_UP, usage unique)', () => {
    it('rejette un code OTP incorrect', async () => {
      await auth.requestOtp({ mode: AuthMode.SIGN_UP, phone: testPhone });
      await expect(
        auth.verifyOtp({ mode: AuthMode.SIGN_UP, phone: testPhone, code: '000000', password: SIGNUP_PASSWORD }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejette un code OTP expiré (jamais demandé)', async () => {
      await expect(
        auth.verifyOtp({ mode: AuthMode.SIGN_UP, phone: testPhone, code: '123456', password: SIGNUP_PASSWORD }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('exige un mot de passe pour activer le compte', async () => {
      await auth.requestOtp({ mode: AuthMode.SIGN_UP, phone: testPhone });
      const code = stubSender.getLastCode(testPhone);
      await expect(
        auth.verifyOtp({ mode: AuthMode.SIGN_UP, phone: testPhone, code: code! }),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepte le bon code + mot de passe, active le compte et retourne des tokens', async () => {
      await auth.requestOtp({ mode: AuthMode.SIGN_UP, phone: testPhone });
      const code = stubSender.getLastCode(testPhone);
      expect(code).toMatch(/^\d{6}$/);
      const tokens = await auth.verifyOtp({
        mode: AuthMode.SIGN_UP,
        phone: testPhone,
        code: code!,
        password: SIGNUP_PASSWORD,
      });
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      const driver = await prisma.driver.findFirstOrThrow({ where: { phone: testPhone } });
      driverIds.push(driver.id);
      expect(driver.status).toBe('ACTIVE');
      expect(driver.passwordHash).toBeTruthy();
    });

    it('bloque le renvoi trop rapide du code (cooldown anti-spam)', async () => {
      await auth.requestOtp({ mode: AuthMode.SIGN_UP, phone: testPhone });
      await expect(auth.resendOtp({ mode: AuthMode.SIGN_UP, phone: testPhone })).rejects.toThrow(BadRequestException);
    });

    it('bloque après trop de tentatives échouées', async () => {
      await auth.requestOtp({ mode: AuthMode.SIGN_UP, phone: testPhone });
      for (let i = 0; i < 5; i++) {
        await auth.verifyOtp({ mode: AuthMode.SIGN_UP, phone: testPhone, code: '000000', password: SIGNUP_PASSWORD }).catch(() => undefined);
      }
      const code = stubSender.getLastCode(testPhone);
      // Même avec le bon code, le compteur de tentatives max est atteint.
      await expect(
        auth.verifyOtp({ mode: AuthMode.SIGN_UP, phone: testPhone, code: code!, password: SIGNUP_PASSWORD }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("l'OTP n'est plus un moyen de connexion (mode LOGIN désactivé)", () => {
    it('requestOtp en LOGIN répond 410 Gone', async () => {
      await expect(auth.requestOtp({ phone: testPhone })).rejects.toThrow(GoneException);
    });

    it('verifyOtp en LOGIN répond 410 Gone', async () => {
      await expect(auth.verifyOtp({ phone: testPhone, code: '123456' })).rejects.toThrow(GoneException);
    });

    it('resendOtp en LOGIN répond 410 Gone', async () => {
      await expect(auth.resendOtp({ phone: testPhone })).rejects.toThrow(GoneException);
    });
  });

  describe('connexion chauffeur par mot de passe (sans OTP)', () => {
    it('connecte un compte actif avec le bon mot de passe, sans créer de demande OTP', async () => {
      await createActiveDriver(testPhone, 'DriverPass123');
      const before = await prisma.otpRequest.count({ where: { identifier: testPhone } });
      const session = await auth.driverLogin({ phone: testPhone, password: 'DriverPass123' });
      expect(session.accessToken).toBeDefined();
      expect(session.refreshToken).toBeDefined();
      expect(session.driver.phone).toBe(testPhone);
      const after = await prisma.otpRequest.count({ where: { identifier: testPhone } });
      expect(after).toBe(before);
    });

    it('rejette un mot de passe incorrect (401)', async () => {
      await createActiveDriver(testPhone, 'DriverPass123');
      await expect(auth.driverLogin({ phone: testPhone, password: 'WrongPass123' })).rejects.toThrow(UnauthorizedException);
    });

    it('rejette un compte inexistant sans oracle (401 générique)', async () => {
      await expect(auth.driverLogin({ phone: testPhone, password: 'Whatever123' })).rejects.toThrow(UnauthorizedException);
    });

    it('rejette un compte non vérifié avec le message d’activation (403)', async () => {
      const driver = await prisma.driver.create({
        data: {
          organizationId: DEMO_ORG_ID,
          firstName: 'Test',
          lastName: 'Chauffeur',
          phone: testPhone,
          status: 'PENDING_VERIFICATION',
          passwordHash: await argon2.hash('DriverPass123'),
        },
      });
      driverIds.push(driver.id);
      const err = await auth.driverLogin({ phone: testPhone, password: 'DriverPass123' }).catch((e) => e);
      expect(err).toBeInstanceOf(ForbiddenException);
      expect(err.message).toContain('vérifier votre compte');
    });

    it('rejette un compte actif sans mot de passe en indiquant la récupération (403)', async () => {
      await createActiveDriver(testPhone);
      const err = await auth.driverLogin({ phone: testPhone, password: 'Whatever123' }).catch((e) => e);
      expect(err).toBeInstanceOf(ForbiddenException);
      expect(err.message).toContain('Mot de passe oublié');
    });
  });

  describe('mot de passe oublié (récupération par OTP)', () => {
    it('réinitialise le mot de passe puis permet la connexion sans OTP', async () => {
      await createActiveDriver(testPhone, 'OldPass123');
      const req = await auth.requestPasswordReset({ channel: OtpChannel.WHATSAPP, phone: testPhone });
      expect(req.message).toBeDefined();
      const code = stubSender.getLastCode(testPhone);
      expect(code).toMatch(/^\d{6}$/);
      const res = await auth.verifyPasswordReset({
        channel: OtpChannel.WHATSAPP,
        phone: testPhone,
        code: code!,
        newPassword: 'BrandNewPass123',
      });
      expect(res.message).toBeDefined();
      const session = await auth.driverLogin({ phone: testPhone, password: 'BrandNewPass123' });
      expect(session.accessToken).toBeDefined();
      await expect(auth.driverLogin({ phone: testPhone, password: 'OldPass123' })).rejects.toThrow(UnauthorizedException);
    });

    it('réponse générique si le compte n’existe pas (pas d’oracle)', async () => {
      const req = await auth.requestPasswordReset({ channel: OtpChannel.WHATSAPP, phone: testPhone });
      expect(req.message).toBeDefined();
      expect((req as any).devCode).toBeUndefined();
    });

    it('rejette un code de récupération incorrect', async () => {
      await createActiveDriver(testPhone, 'OldPass123');
      await auth.requestPasswordReset({ channel: OtpChannel.WHATSAPP, phone: testPhone });
      await expect(
        auth.verifyPasswordReset({ channel: OtpChannel.WHATSAPP, phone: testPhone, code: '000000', newPassword: 'BrandNewPass123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('révoque les sessions existantes après réinitialisation', async () => {
      await createActiveDriver(testPhone, 'OldPass123');
      const before = await auth.driverLogin({ phone: testPhone, password: 'OldPass123' });
      await auth.requestPasswordReset({ channel: OtpChannel.WHATSAPP, phone: testPhone });
      const code = stubSender.getLastCode(testPhone);
      await auth.verifyPasswordReset({ channel: OtpChannel.WHATSAPP, phone: testPhone, code: code!, newPassword: 'BrandNewPass123' });
      await expect(auth.refresh({ refreshToken: before.refreshToken })).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh sans OTP', () => {
    it("le refresh ne crée aucune demande OTP", async () => {
      await createActiveDriver(testPhone, 'DriverPass123');
      const session = await auth.driverLogin({ phone: testPhone, password: 'DriverPass123' });
      const before = await prisma.otpRequest.count({ where: { identifier: testPhone } });
      const rotated = await auth.refresh({ refreshToken: session.refreshToken });
      expect(rotated.accessToken).toBeDefined();
      const after = await prisma.otpRequest.count({ where: { identifier: testPhone } });
      expect(after).toBe(before);
    });
  });

  describe('changement de mot de passe', () => {
    let userId: string;
    const email = `test-${randomUUID()}@demo.local`;

    beforeAll(async () => {
      const role = await prisma.role.findUniqueOrThrow({ where: { name: 'ADMIN' } });
      const user = await prisma.user.create({
        data: {
          organizationId: DEMO_ORG_ID,
          email,
          passwordHash: await argon2.hash('OldPassw0rd'),
          roleId: role.id,
        },
      });
      userId = user.id;
    });

    afterAll(async () => {
      await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    });

    it("refuse si le mot de passe actuel est incorrect", async () => {
      await expect(
        auth.changePassword(userId, { currentPassword: 'WrongPassword1', newPassword: 'NewPassw0rd1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepte un changement valide avec le bon mot de passe actuel', async () => {
      const result = await auth.changePassword(userId, { currentPassword: 'OldPassw0rd', newPassword: 'NewPassw0rd1' });
      expect(result.message).toBeDefined();
    });

    it('rejette (au niveau DTO) un nouveau mot de passe qui ne respecte pas la complexité', async () => {
      const dto = plainToInstance(ChangePasswordDto, { currentPassword: 'OldPassw0rd', newPassword: 'weak' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
