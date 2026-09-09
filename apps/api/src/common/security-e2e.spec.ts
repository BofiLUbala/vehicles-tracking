import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../app.module';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { PrismaService } from '../prisma/prisma.service';
import { StubWhatsappSender } from '../auth/senders/stub-whatsapp.sender';

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
  let stubSender: StubWhatsappSender;

  const driverIds: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    app.setGlobalPrefix('api/v1', { exclude: ['health'] });
    await app.init();

    prisma = moduleRef.get(PrismaService);
    stubSender = moduleRef.get(StubWhatsappSender);
  }, 30_000);

  afterAll(async () => {
    await prisma.driver.deleteMany({ where: { id: { in: driverIds } } }).catch(() => undefined);
    await app.close();
  });

  async function driverAccessToken(): Promise<string> {
    const phone = randomPhone();
    const driver = await prisma.driver.create({ data: { organizationId: DEMO_ORG_ID, firstName: 'Sec', lastName: 'Test', phone } });
    driverIds.push(driver.id);

    await request(app.getHttpServer()).post('/api/v1/auth/otp/request').send({ phone }).expect(201);
    const code = stubSender.getLastCode(phone);
    const res = await request(app.getHttpServer()).post('/api/v1/auth/otp/verify').send({ phone, code }).expect(201);
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
  });

  describe('Validation des entrées — rejette les payloads malformés (400)', () => {
    it('400 : téléphone hors format E.164 sur POST /auth/otp/request', async () => {
      await request(app.getHttpServer()).post('/api/v1/auth/otp/request').send({ phone: '0123456789' }).expect(400);
    });

    it('400 : champ requis manquant', async () => {
      await request(app.getHttpServer()).post('/api/v1/auth/otp/request').send({}).expect(400);
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
      "renvoie 429 au-delà de la limite globale sur un endpoint public (otp/request)",
      async () => {
        const server = app.getHttpServer();
        let sawTooManyRequests = false;
        // Limite globale configurée dans CommonModule : 100 req / 60s. On en envoie volontairement
        // plus pour observer le 429 — un numéro différent à chaque appel pour ne pas se heurter
        // d'abord au cooldown métier (400) qui masquerait le comportement du guard.
        for (let i = 0; i < 110 && !sawTooManyRequests; i++) {
          const res = await request(server).post('/api/v1/auth/otp/request').send({ phone: randomPhone() });
          if (res.status === 429) sawTooManyRequests = true;
        }
        expect(sawTooManyRequests).toBe(true);
      },
      60_000,
    );
  });
});
