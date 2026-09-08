import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AuthModule } from './auth.module';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { StubWhatsappSender } from './senders/stub-whatsapp.sender';

const DEMO_ORG_ID = '00000000-0000-0000-0000-000000000001';

describe('AuthService (intégration, DB + Redis réels)', () => {
  let auth: AuthService;
  let prisma: PrismaService;
  let stubSender: StubWhatsappSender;
  let testPhone: string;
  let driverId: string;
  let moduleRef: any;

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
    const driver = await prisma.driver.create({
      data: { organizationId: DEMO_ORG_ID, firstName: 'Test', lastName: 'Chauffeur', phone: testPhone },
    });
    driverId = driver.id;
  });

  afterEach(async () => {
    await prisma.driver.delete({ where: { id: driverId } }).catch(() => undefined);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('rejette un code OTP incorrect', async () => {
    await auth.requestOtp({ phone: testPhone });
    await expect(auth.verifyOtp({ phone: testPhone, code: '000000' })).rejects.toThrow(UnauthorizedException);
  });

  it('rejette un code OTP expiré (jamais demandé)', async () => {
    await expect(auth.verifyOtp({ phone: testPhone, code: '123456' })).rejects.toThrow(UnauthorizedException);
  });

  it('accepte le bon code OTP et retourne des tokens', async () => {
    await auth.requestOtp({ phone: testPhone });
    const code = stubSender.getLastCode(testPhone);
    expect(code).toMatch(/^\d{6}$/);
    const tokens = await auth.verifyOtp({ phone: testPhone, code: code! });
    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();
  });

  it('bloque le renvoi trop rapide du code (cooldown anti-spam)', async () => {
    await auth.requestOtp({ phone: testPhone });
    await expect(auth.resendOtp({ phone: testPhone })).rejects.toThrow(BadRequestException);
  });

  it('bloque après trop de tentatives échouées', async () => {
    await auth.requestOtp({ phone: testPhone });
    for (let i = 0; i < 5; i++) {
      await auth.verifyOtp({ phone: testPhone, code: '000000' }).catch(() => undefined);
    }
    const code = stubSender.getLastCode(testPhone);
    // Même avec le bon code, le compteur de tentatives max est atteint.
    await expect(auth.verifyOtp({ phone: testPhone, code: code! })).rejects.toThrow(UnauthorizedException);
  });

  describe('changement de mot de passe', () => {
    let userId: string;
    const email = `test-${randomUUID()}@demo.local`;

    beforeAll(async () => {
      const argon2 = await import('argon2');
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
