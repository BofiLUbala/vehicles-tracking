import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpChannel } from '@prisma/client';
import { OtpSenderPort } from '../ports/otp-sender.port';
import { StubEmailSender } from './stub-email.sender';
import { SmtpEmailSender } from './smtp-email.sender';

/**
 * Envoi e-mail "live" avec repli journalisé. Quand le SMTP est injoignable (poste de dev derrière un
 * pare-feu/antivirus, coupure réseau), le code est écrit dans les logs de l'API au lieu de faire
 * échouer toute la création de compte ou la connexion.
 *
 * Le repli est volontairement inopérant en production : il n'est actif que si
 * OTP_EMAIL_FALLBACK_LOG=true ET NODE_ENV != production.
 */
@Injectable()
export class FallbackEmailSender implements OtpSenderPort {
  readonly channel = OtpChannel.EMAIL;
  private readonly logger = new Logger('FallbackEmailSender');

  constructor(
    private readonly smtp: SmtpEmailSender,
    private readonly stub: StubEmailSender,
    private readonly config: ConfigService,
  ) {}

  get fallbackEnabled(): boolean {
    return (
      this.config.get<string>('OTP_EMAIL_FALLBACK_LOG') === 'true' &&
      (this.config.get<string>('NODE_ENV') ?? process.env.NODE_ENV) !== 'production'
    );
  }

  async send(identifier: string, code: string): Promise<void> {
    try {
      await this.smtp.send(identifier, code);
    } catch (error) {
      if (!this.fallbackEnabled) throw error;
      this.logger.warn(
        `SMTP indisponible — repli sur la journalisation du code pour ${identifier} (OTP_EMAIL_FALLBACK_LOG=true)`,
      );
      await this.stub.send(identifier, code);
    }
  }
}
