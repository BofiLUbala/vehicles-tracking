import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpChannel } from '@prisma/client';
import { OtpSenderPort } from '../ports/otp-sender.port';

/**
 * Implémentation "live" par e-mail (SMTP). Nécessite l'ajout d'un client SMTP (ex: nodemailer)
 * comme dépendance — volontairement non ajouté en Phase 1 pour ne pas gonfler le bundle tant
 * qu'aucun environnement de production n'est câblé. Échoue explicitement si appelée.
 */
@Injectable()
export class SmtpEmailSender implements OtpSenderPort {
  readonly channel = OtpChannel.EMAIL;
  private readonly logger = new Logger('SmtpEmailSender');

  constructor(private readonly config: ConfigService) {}

  async send(identifier: string, _code: string): Promise<void> {
    const host = this.config.get<string>('SMTP_HOST');
    if (!host) {
      throw new NotImplementedException(
        "Envoi e-mail réel non configuré (SMTP_HOST manquant) — ajouter un client SMTP (ex: nodemailer) pour l'activer",
      );
    }
    this.logger.warn(`Envoi SMTP réel non implémenté pour ${identifier}`);
    throw new NotImplementedException("Client SMTP non implémenté en Phase 1");
  }
}
