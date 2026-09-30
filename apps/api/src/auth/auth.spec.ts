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
import { ChangePasswordDto } from './dto/change-password.dto';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { OTP_SENDER_EMAIL } from './ports/otp-sender.port';
import { StubEmailSender } from './senders/stub-email.sender';
import { SmtpEmailSender } from './senders/smtp-email.sender';
import { DRIVER_INVITATION_TTL_MS, generateDriverLinkToken } from '../drivers/driver-link-token';

const DEMO_ORG_ID = '00000000-0000-0000-0000-000000000001';

jest.setTimeout(30000);

describe('AuthService (intégration, DB + Redis réels)', () => {
  let auth: AuthService;
  let prisma: PrismaService;
  let otpEmails: StubEmailSender;
  let testPhone: string;
  let testEmail: string;
  let moduleRef: any;

  // Liens chauffeur : aucun e-mail réel, on capture le jeton envoyé.
  const driverEmails = {
    sendDriverInvitation: jest.fn().mockResolvedValue(undefined),
    sendDriverPasswordReset: jest.fn().mockResolvedValue(undefined),
  };

  const driverIds: string[] = [];

  async function createActiveDriver(password?: string) {
    const driver = await prisma.driver.create({
      data: {
        organizationId: DEMO_ORG_ID,
        firstName: 'Test',
        lastName: 'Chauffeur',
        phone: testPhone,
        email: testEmail,
        status: 'ACTIVE',
        ...(password ? { passwordHash: await argon2.hash(password) } : {}),
      },
    });
    driverIds.push(driver.id);
    return driver;
  }

  /** Chauffeur invité par l'admin (sans mot de passe) et jeton en clair du lien d'activation. */
  async function createInvitedDriver(expiresAt?: Date) {
    const { token, tokenHash, expiresAt: defaultExpiry } = generateDriverLinkToken(DRIVER_INVITATION_TTL_MS);
    const driver = await prisma.driver.create({
      data: {
        organizationId: DEMO_ORG_ID,
        firstName: 'Invité',
        lastName: 'Chauffeur',
        phone: testPhone,
        email: testEmail,
        status: 'ACTIVE',
        invitationTokenHash: tokenHash,
        invitationExpiresAt: expiresAt ?? defaultExpiry,
      },
    });
    driverIds.push(driver.id);
    return { driver, token };
  }

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule],
    })
      .overrideProvider(OTP_SENDER_EMAIL)
      .useClass(StubEmailSender)
      .overrideProvider(SmtpEmailSender)
      .useValue(driverEmails)
      .compile();

    auth = moduleRef.get(AuthService);
    prisma = moduleRef.get(PrismaService);
    otpEmails = moduleRef.get(OTP_SENDER_EMAIL);
  });

  beforeEach(async () => {
    testPhone = `+2439${Math.floor(10000000 + Math.random() * 89999999)}`;
    testEmail = `chauffeur-${randomUUID()}@demo.local`;
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await prisma.driver.deleteMany({ where: { id: { in: driverIds } } }).catch(() => undefined);
    driverIds.length = 0;
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  describe("activation chauffeur par le lien d'invitation (aucun code)", () => {
    it('définit le mot de passe, ouvre la session, puis la connexion par mot de passe fonctionne', async () => {
      const { driver, token } = await createInvitedDriver();
      const invitation = await auth.getDriverInvitation({ token });
      expect(invitation.firstName).toBe('Invité');

      const session = await auth.activateDriver({ token, password: 'DriverPass123' });
      expect(session.accessToken).toBeDefined();
      expect(session.driver.id).toBe(driver.id);

      const stored = await prisma.driver.findUniqueOrThrow({ where: { id: driver.id } });
      expect(stored.invitationTokenHash).toBeNull();
      const login = await auth.driverLogin({ email: testEmail, password: 'DriverPass123' });
      expect(login.accessToken).toBeDefined();
      expect(await prisma.otpRequest.count({ where: { identifier: { in: [testPhone, testEmail] } } })).toBe(0);
    });

    it('un lien ne sert qu’une fois', async () => {
      const { token } = await createInvitedDriver();
      await auth.activateDriver({ token, password: 'DriverPass123' });
      await expect(auth.activateDriver({ token, password: 'OtherPass123' })).rejects.toThrow(GoneException);
    });

    it('refuse un lien expiré', async () => {
      const { token } = await createInvitedDriver(new Date(Date.now() - 1000));
      await expect(auth.getDriverInvitation({ token })).rejects.toThrow(GoneException);
      await expect(auth.activateDriver({ token, password: 'DriverPass123' })).rejects.toThrow(GoneException);
    });

    it('la connexion avant activation renvoie vers le lien reçu par e-mail (403)', async () => {
      await createInvitedDriver();
      const err = await auth.driverLogin({ email: testEmail, password: 'Whatever123' }).catch((e) => e);
      expect(err).toBeInstanceOf(ForbiddenException);
      expect(err.message).toContain('lien d’activation');
    });
  });

  describe('connexion chauffeur par mot de passe (sans OTP)', () => {
    it('connecte un compte actif avec le bon mot de passe, sans créer de demande OTP', async () => {
      await createActiveDriver('DriverPass123');
      const before = await prisma.otpRequest.count({ where: { identifier: testPhone } });
      const session = await auth.driverLogin({ phone: testPhone, password: 'DriverPass123' });
      expect(session.accessToken).toBeDefined();
      expect(session.refreshToken).toBeDefined();
      expect(session.driver.phone).toBe(testPhone);
      const after = await prisma.otpRequest.count({ where: { identifier: testPhone } });
      expect(after).toBe(before);
    });

    it('rejette un mot de passe incorrect (401)', async () => {
      await createActiveDriver('DriverPass123');
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

    it('rejette un compte actif sans mot de passe en renvoyant vers le coordinateur (403)', async () => {
      await createActiveDriver();
      const err = await auth.driverLogin({ phone: testPhone, password: 'Whatever123' }).catch((e) => e);
      expect(err).toBeInstanceOf(ForbiddenException);
      expect(err.message).toContain('renvoyer l’invitation');
    });
  });

  describe('mot de passe oublié chauffeur (lien par e-mail, aucun code)', () => {
    async function requestResetToken(): Promise<string> {
      await auth.requestDriverPasswordReset({ email: testEmail });
      expect(driverEmails.sendDriverPasswordReset).toHaveBeenCalledTimes(1);
      return driverEmails.sendDriverPasswordReset.mock.calls[0][2];
    }

    it('réinitialise le mot de passe par le lien puis permet la connexion', async () => {
      await createActiveDriver('OldPass123');
      const token = await requestResetToken();
      const res = await auth.confirmDriverPasswordReset({ token, newPassword: 'BrandNewPass123' });
      expect(res.message).toBeDefined();
      const session = await auth.driverLogin({ email: testEmail, password: 'BrandNewPass123' });
      expect(session.accessToken).toBeDefined();
      await expect(auth.driverLogin({ email: testEmail, password: 'OldPass123' })).rejects.toThrow(UnauthorizedException);
      expect(await prisma.otpRequest.count({ where: { identifier: testEmail } })).toBe(0);
    });

    it('réponse générique et aucun e-mail si le compte n’existe pas (pas d’oracle)', async () => {
      const req = await auth.requestDriverPasswordReset({ email: testEmail });
      expect(req.message).toBeDefined();
      expect(driverEmails.sendDriverPasswordReset).not.toHaveBeenCalled();
    });

    it('un lien de réinitialisation ne sert qu’une fois', async () => {
      await createActiveDriver('OldPass123');
      const token = await requestResetToken();
      await auth.confirmDriverPasswordReset({ token, newPassword: 'BrandNewPass123' });
      await expect(auth.confirmDriverPasswordReset({ token, newPassword: 'AnotherPass123' })).rejects.toThrow(GoneException);
    });

    it('révoque les sessions existantes après réinitialisation', async () => {
      await createActiveDriver('OldPass123');
      const before = await auth.driverLogin({ email: testEmail, password: 'OldPass123' });
      const token = await requestResetToken();
      await auth.confirmDriverPasswordReset({ token, newPassword: 'BrandNewPass123' });
      await expect(auth.refresh({ refreshToken: before.refreshToken })).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh sans OTP', () => {
    it("le refresh ne crée aucune demande OTP", async () => {
      await createActiveDriver('DriverPass123');
      const session = await auth.driverLogin({ phone: testPhone, password: 'DriverPass123' });
      const before = await prisma.otpRequest.count({ where: { identifier: testPhone } });
      const rotated = await auth.refresh({ refreshToken: session.refreshToken });
      expect(rotated.accessToken).toBeDefined();
      const after = await prisma.otpRequest.count({ where: { identifier: testPhone } });
      expect(after).toBe(before);
    });
  });

  describe('comptes admin : mot de passe oublié par code e-mail, changement de mot de passe', () => {
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

    it('rejette un code de récupération incorrect, puis bloque le renvoi trop rapide', async () => {
      await auth.requestPasswordReset({ channel: OtpChannel.EMAIL, email });
      await expect(
        auth.verifyPasswordReset({ channel: OtpChannel.EMAIL, email, code: '000000', newPassword: 'BrandNewPass123' }),
      ).rejects.toThrow(UnauthorizedException);
      await expect(auth.requestPasswordReset({ channel: OtpChannel.EMAIL, email })).rejects.toThrow(BadRequestException);
    });

    it('réinitialise le mot de passe admin avec le bon code', async () => {
      // Le cooldown du test précédent est encore actif : on vérifie le code déjà émis.
      const code = otpEmails.getLastCode(email);
      expect(code).toMatch(/^\d{6}$/);
      const res = await auth.verifyPasswordReset({ channel: OtpChannel.EMAIL, email, code: code!, newPassword: 'OldPassw0rd' });
      expect(res.message).toBeDefined();
    });

    it("refuse un changement si le mot de passe actuel est incorrect", async () => {
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
