import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import * as argon2 from 'argon2';
import { AppModule } from '../app.module';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { PrismaService } from '../prisma/prisma.service';

const DEMO_ORG_ID = '00000000-0000-0000-0000-000000000001';

function randomPhone() {
  return `+2439${Math.floor(10000000 + Math.random() * 89999999)}`;
}

/**
 * Tests de sécurité de bout en bout (section 18) — boot de l'application COMPLÈTE (AppModule, tous
 * les guards globaux réels : ThrottlerGuard -> JwtAuthGuard -> RolesGuard, ValidationPipe globale
 * comme dans main.ts) plutôt que des unités isolées, pour vérifier ce que les tests unitaires
 * existants (`roles.guard.spec.ts`, tests service-level d'AuthService) ne couvrent pas : le
 * comportement HTTP réel, guard par guard, dans l'ordre réel.
 */
describe('Sécurité — bout en bout (section 18)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const driverIds: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    app.setGlobalPrefix('api/v1', { exclude: ['health'] });
    await app.init();

    prisma = moduleRef.get(PrismaService);
  }, 30_000);

  afterAll(async () => {
    await prisma.driver.deleteMany({ where: { id: { in: driverIds } } }).catch(() => undefined);
    await app.close();
  });

  async function driverAccessToken(): Promise<string> {
    // Connexion chauffeur par mot de passe (l'OTP n'est plus un moyen de connexion).
    const phone = randomPhone();
    const password = 'E2eDriverPass123';
    const driver = await prisma.driver.create({
      data: {
        organizationId: DEMO_ORG_ID,
        firstName: 'Sec',
        lastName: 'Test',
        phone,
        status: 'ACTIVE',
        passwordHash: await argon2.hash(password),
      },
    });
    driverIds.push(driver.id);

    const res = await request(app.getHttpServer()).post('/api/v1/auth/driver/login').send({ phone, password }).expect(201);
    return res.body.accessToken;
  }

  describe('RBAC — refus par rôle, réellement appliqué sur la pile HTTP', () => {
    it('401 sans token sur un endpoint protégé (reports, alerts, fuel-records)', async () => {
      await request(app.getHttpServer()).get('/api/v1/reports/missions').expect(401);
      await request(app.getHttpServer()).get('/api/v1/alerts').expect(401);
      await request(app.getHttpServer()).get('/api/v1/fuel-records').expect(401);
    });

    it("403 pour un chauffeur (DRIVER) sur des endpoints réservés ADMIN/SUPER_ADMIN", async () => {
      const token = await driverAccessToken();
      await request(app.getHttpServer()).get('/api/v1/reports/missions').set('Authorization', `Bearer ${token}`).expect(403);
      await request(app.getHttpServer()).get('/api/v1/alerts').set('Authorization', `Bearer ${token}`).expect(403);
      await request(app.getHttpServer()).get('/api/v1/reports/fuel').set('Authorization', `Bearer ${token}`).expect(403);
    });

    it('401 avec un token invalide/mal formé', async () => {
      await request(app.getHttpServer()).get('/api/v1/reports/missions').set('Authorization', 'Bearer not-a-real-jwt').expect(401);
    });

    it("410 Gone : l'OTP n'est plus un moyen de connexion (connexion par mot de passe requise)", async () => {
      await request(app.getHttpServer()).post('/api/v1/auth/otp/request').send({ phone: randomPhone() }).expect(410);
      await request(app.getHttpServer())
        .post('/api/v1/auth/otp/verify')
        .send({ phone: randomPhone(), code: '123456' })
        .expect(410);
    });
  });

  describe('Validation des entrées — rejette les payloads malformés (400)', () => {
    it('400 : téléphone hors format E.164 sur POST /auth/otp/request', async () => {
      await request(app.getHttpServer()).post('/api/v1/auth/otp/request').send({ phone: '0123456789' }).expect(400);
    });

    it('400 : champ requis manquant', async () => {
      // Mode SIGN_UP sans identifiant : la validation DTO passe (champs optionnels),
      // le service rejette l'identifiant manquant (l'OTP LOGIN répond 410, voir test dédié).
      await request(app.getHttpServer()).post('/api/v1/auth/otp/request').send({ mode: 'SIGN_UP' }).expect(400);
    });

    it('400 : champ non attendu rejeté (whitelist/forbidNonWhitelisted)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/otp/request')
        .send({ phone: randomPhone(), isAdmin: true })
        .expect(400);
    });

    it("400 : enum invalide (channel inconnu)", async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/otp/request')
        .send({ phone: randomPhone(), channel: 'CARRIER_PIGEON' })
        .expect(400);
    });
  });

  describe('Rate limiting — ThrottlerGuard réellement appliqué (pas seulement configuré)', () => {
    it(
      "renvoie 429 au-delà de la limite globale sur un endpoint public (health)",
      async () => {
        const server = app.getHttpServer();
        let sawTooManyRequests = false;
        // Limite globale configurée dans CommonModule : 100 req / 60s. On en envoie volontairement
        // plus pour observer le 429. GET /health est volontairement choisi plutôt qu'un endpoint
        // OTP : il traverse le même ThrottlerGuard global sans coûter un hash argon2 par appel.
        for (let i = 0; i < 110 && !sawTooManyRequests; i++) {
          const res = await request(server).get('/health');
          if (res.status === 429) sawTooManyRequests = true;
        }
        expect(sawTooManyRequests).toBe(true);
      },
      60_000,
    );
  });
});
