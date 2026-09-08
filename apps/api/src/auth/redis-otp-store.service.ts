import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

interface OtpEntry {
  codeHash: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: number;
  lastSentAt: number;
}

/**
 * Fast-path Redis pour l'application des règles OTP (TTL, tentatives, cooldown de renvoi).
 * La table Postgres `otp_requests` reste la trace durable/auditable ; Redis fait respecter
 * les contraintes temps réel sans aller-retour DB à chaque tentative.
 */
@Injectable()
export class RedisOtpStore implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly ttlSeconds = 5 * 60; // 5 minutes
  readonly resendCooldownSeconds = 60;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('REDIS_URL') || 'redis://localhost:6379';
    this.client = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1 });
    this.client.on('error', () => {
      /* évite un crash process si Redis est indisponible en environnement de test */
    });
  }

  private key(identifier: string, channel: string) {
    return `otp:${channel}:${identifier}`;
  }

  async connectIfNeeded() {
    if (this.client.status === 'wait' || this.client.status === 'end') {
      await this.client.connect().catch(() => undefined);
    }
  }

  async set(identifier: string, channel: string, codeHash: string, maxAttempts = 5): Promise<void> {
    await this.connectIfNeeded();
    const entry: OtpEntry = {
      codeHash,
      attempts: 0,
      maxAttempts,
      expiresAt: Date.now() + this.ttlSeconds * 1000,
      lastSentAt: Date.now(),
    };
    await this.client.set(this.key(identifier, channel), JSON.stringify(entry), 'EX', this.ttlSeconds);
  }

  async get(identifier: string, channel: string): Promise<OtpEntry | null> {
    await this.connectIfNeeded();
    const raw = await this.client.get(this.key(identifier, channel));
    return raw ? (JSON.parse(raw) as OtpEntry) : null;
  }

  async incrementAttempts(identifier: string, channel: string): Promise<OtpEntry | null> {
    const entry = await this.get(identifier, channel);
    if (!entry) return null;
    entry.attempts += 1;
    const ttl = Math.max(1, Math.floor((entry.expiresAt - Date.now()) / 1000));
    await this.client.set(this.key(identifier, channel), JSON.stringify(entry), 'EX', ttl);
    return entry;
  }

  async consume(identifier: string, channel: string): Promise<void> {
    await this.connectIfNeeded();
    await this.client.del(this.key(identifier, channel));
  }

  /** Retourne le nombre de secondes restant avant de pouvoir renvoyer un OTP, 0 si autorisé. */
  async secondsUntilResendAllowed(identifier: string, channel: string): Promise<number> {
    const entry = await this.get(identifier, channel);
    if (!entry) return 0;
    const elapsed = (Date.now() - entry.lastSentAt) / 1000;
    return Math.max(0, Math.ceil(this.resendCooldownSeconds - elapsed));
  }

  async onModuleDestroy() {
    this.client.disconnect();
  }
}
