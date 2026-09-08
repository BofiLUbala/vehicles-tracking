import { Injectable, Logger } from '@nestjs/common';
import { OtpChannel } from '@prisma/client';
import { OtpSenderPort } from '../ports/otp-sender.port';

/**
 * Implémentation de développement : journalise le code au lieu d'appeler l'API WhatsApp.
 * Garde le dernier code envoyé par identifiant en mémoire pour permettre aux tests de le récupérer.
 */
@Injectable()
export class StubWhatsappSender implements OtpSenderPort {
  readonly channel = OtpChannel.WHATSAPP;
  private readonly logger = new Logger('StubWhatsappSender');
  private readonly lastCodes = new Map<string, string>();

  async send(identifier: string, code: string): Promise<void> {
    this.lastCodes.set(identifier, code);
    this.logger.log(`[DEV STUB] Code OTP WhatsApp pour ${identifier} : ${code}`);
  }

  /** Utilisé uniquement par les tests pour récupérer le dernier code envoyé (jamais en production). */
  getLastCode(identifier: string): string | undefined {
    return this.lastCodes.get(identifier);
  }
}
