import * as dns from 'dns';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import * as nodemailer from 'nodemailer';
import * as path from 'path';
import { SmtpEmailSender } from './smtp-email.sender';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

const createTransport = nodemailer.createTransport as unknown as jest.Mock;

// Stub de configuration HERMÉTIQUE : `ConfigService` lirait d'abord `process.env` (chargé depuis `.env`)
// et masquerait les valeurs injectées par le test.
function stubConfig(values: Record<string, string | undefined>) {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

function makeSender(env: Record<string, string | undefined> = {}) {
  return new SmtpEmailSender(
    stubConfig({
      SMTP_HOST: 'smtp.example.test',
      SMTP_PORT: '587',
      SMTP_USER: 'user@example.test',
      SMTP_PASSWORD: 'not-a-real-password',
      SMTP_FROM: 'from@example.test',
      SMTP_CONNECTION_TIMEOUT_MS: '200',
      ...env,
    }),
  );
}

describe('SmtpEmailSender — résolution DNS et transport', () => {
  let sendMail: jest.Mock;
  let lookup: jest.SpyInstance;

  beforeEach(() => {
    sendMail = jest.fn().mockResolvedValue({ messageId: 'x' });
    createTransport.mockReset().mockReturnValue({ sendMail, verify: jest.fn().mockResolvedValue(true), close: jest.fn() });
    lookup = jest.spyOn(dns.promises, 'lookup');
  });
  afterEach(() => jest.restoreAllMocks());

  // Régression constatée en conditions réelles : nodemailer résout avec dns.resolve4/6 (c-ares), qui ne
  // répondait jamais (DNS local 127.0.0.1) alors que dns.lookup répondait en ms => chaque envoi expirait.
  it("se connecte à l'IP résolue par le résolveur du système et garde le nom d'hôte pour le certificat TLS", async () => {
    lookup.mockResolvedValue({ address: '74.125.197.108', family: 4 } as never);
    const sender = makeSender();

    await sender.send('driver@example.test', '123456');

    const options = createTransport.mock.calls[0][0];
    expect(options.host).toBe('74.125.197.108');
    expect(options.tls).toEqual({ servername: 'smtp.example.test' });
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'driver@example.test' }));
  });

  it('retombe sur le nom d\'hôte (comportement d\'origine) si la résolution système échoue', async () => {
    lookup.mockRejectedValue(new Error('ENOTFOUND'));
    await makeSender().send('driver@example.test', '123456');

    const options = createTransport.mock.calls[0][0];
    expect(options.host).toBe('smtp.example.test');
    expect(options.tls).toBeUndefined();
  });

  it("ne reste pas bloqué si la résolution DNS ne répond jamais (borné par le délai de connexion)", async () => {
    lookup.mockReturnValue(new Promise(() => undefined) as never); // ne se résout jamais
    const started = Date.now();
    await makeSender({ SMTP_CONNECTION_TIMEOUT_MS: '60' }).send('driver@example.test', '123456');

    expect(Date.now() - started).toBeLessThan(1500);
    expect(createTransport.mock.calls[0][0].host).toBe('smtp.example.test'); // repli
  });

  it("ne résout pas un hôte qui est déjà une adresse IP", async () => {
    await makeSender({ SMTP_HOST: '10.0.0.5' }).send('driver@example.test', '123456');
    expect(lookup).not.toHaveBeenCalled();
    expect(createTransport.mock.calls[0][0].host).toBe('10.0.0.5');
  });

  it('crée le transport une seule fois (pool réutilisé) sur plusieurs envois', async () => {
    lookup.mockResolvedValue({ address: '203.0.113.9', family: 4 } as never);
    const sender = makeSender();
    await sender.send('a@example.test', '111111');
    await sender.send('b@example.test', '222222');
    expect(createTransport).toHaveBeenCalledTimes(1);
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it("l'invitation chauffeur utilise le même transport résolu", async () => {
    lookup.mockResolvedValue({ address: '203.0.113.9', family: 4 } as never);
    await makeSender().sendDriverInvitation('driver@example.test', 'Test');
    expect(createTransport.mock.calls[0][0].host).toBe('203.0.113.9');
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'driver@example.test' }));
  });

  it("refuse explicitement si SMTP_HOST n'est pas configuré (sans jamais simuler un envoi)", async () => {
    const sender = new SmtpEmailSender(stubConfig({ SMTP_USER: 'u', SMTP_PASSWORD: 'p' }));
    await expect(sender.send('driver@example.test', '123456')).rejects.toThrow(/SMTP_HOST manquant/);
    expect(createTransport).not.toHaveBeenCalled();
  });

  it("n'inclut jamais le code ni l'identifiant SMTP dans l'erreur renvoyée", async () => {
    lookup.mockResolvedValue({ address: '203.0.113.9', family: 4 } as never);
    sendMail.mockRejectedValue(new Error('535 auth failed'));
    const error = await makeSender().send('driver@example.test', '987654').catch((e) => e);
    expect(String(error.message)).not.toContain('987654');
    expect(String(error.message)).not.toContain('not-a-real-password');
  });
});

// ---------------------------------------------------------------------------------------------
// Test « live » : envoie un VRAI e-mail. Désactivé par défaut (il tournait à chaque `npm test` et
// contenait un mot de passe d'application en dur). Ne s'exécute que si SMTP_LIVE_TEST=1, avec
// UNIQUEMENT les identifiants de l'environnement — aucune valeur par défaut.
// ---------------------------------------------------------------------------------------------
const liveEnabled = process.env.SMTP_LIVE_TEST === '1';
(liveEnabled ? describe : describe.skip)('SmtpEmailSender — envoi réel (SMTP_LIVE_TEST=1)', () => {
  it('envoie un e-mail de test à SMTP_LIVE_TEST_TO', async () => {
    jest.unmock('nodemailer');
    dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
    const to = process.env.SMTP_LIVE_TEST_TO;
    if (!to) throw new Error('SMTP_LIVE_TEST_TO est requis pour le test live');
    const real = jest.requireActual('nodemailer');
    createTransport.mockImplementation(real.createTransport);

    const sender = new SmtpEmailSender(new ConfigService(process.env as Record<string, string>));
    try {
      await sender.send(to, '000000');
    } finally {
      sender.onModuleDestroy();
    }
  }, 45_000);
});
