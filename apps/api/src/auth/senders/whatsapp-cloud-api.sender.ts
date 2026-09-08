import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpChannel } from '@prisma/client';
import { OtpSenderPort } from '../ports/otp-sender.port';

/**
 * Implémentation "live" via l'API WhatsApp Cloud (Meta). Best-effort : si les variables
 * d'environnement requises ne sont pas renseignées, échoue explicitement plutôt que de
 * simuler un envoi silencieux.
 */
@Injectable()
export class WhatsappCloudApiSender implements OtpSenderPort {
  readonly channel = OtpChannel.WHATSAPP;
  private readonly logger = new Logger('WhatsappCloudApiSender');

  constructor(private readonly config: ConfigService) {}

  async send(identifier: string, code: string): Promise<void> {
    const phoneNumberId = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID');
    const accessToken = this.config.get<string>('WHATSAPP_ACCESS_TOKEN');
    if (!phoneNumberId || !accessToken) {
      throw new NotImplementedException(
        "Envoi WhatsApp réel non configuré (WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN manquants)",
      );
    }
    const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: identifier.replace('+', ''),
        type: 'text',
        text: { body: `Votre code de vérification est : ${code}` },
      }),
    });
    if (!response.ok) {
      this.logger.error(`Échec envoi WhatsApp (${response.status})`);
      throw new Error("Échec de l'envoi du code OTP par WhatsApp");
    }
  }
}
