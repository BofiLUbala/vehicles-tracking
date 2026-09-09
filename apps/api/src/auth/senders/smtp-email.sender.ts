import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpChannel } from '@prisma/client';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { OtpSenderPort } from '../ports/otp-sender.port';

/**
 * Implémentation "live" par e-mail (SMTP, via nodemailer — compatible Gmail, Amazon SES, Brevo,
 * Mailgun, etc. per spec section 3). Activée quand OTP_CHANNEL_MODE=live et SMTP_HOST est renseigné.
 */
@Injectable()
export class SmtpEmailSender implements OtpSenderPort {
  readonly channel = OtpChannel.EMAIL;
  private readonly logger = new Logger('SmtpEmailSender');
  private transporter?: Transporter;

  constructor(private readonly config: ConfigService) {}

  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter;

    const host = this.config.get<string>('SMTP_HOST');
    if (!host) {
      throw new NotImplementedException(
        "Envoi e-mail réel non configuré (SMTP_HOST manquant) — renseigner SMTP_HOST/PORT/USER/PASSWORD/FROM",
      );
    }

    const port = Number(this.config.get<string>('SMTP_PORT')) || 587;
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // STARTTLS implicite sur 587/25, TLS direct sur 465
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASSWORD'),
      },
    });
    return this.transporter;
  }

  async send(identifier: string, code: string): Promise<void> {
    const from = this.config.get<string>('SMTP_FROM') || this.config.get<string>('SMTP_USER');
    const transporter = this.getTransporter();

    try {
      await transporter.sendMail({
        from,
        to: identifier,
        subject: 'Votre code de vérification Tracking Vehicles',
        text: `Votre code Tracking Vehicles est : ${code}\nIl expire dans 5 minutes.\nNe partagez ce code avec personne.`,
        html: `<p>Votre code Tracking Vehicles est : <strong>${code}</strong></p><p>Il expire dans 5 minutes.<br/>Ne partagez ce code avec personne.</p>`,
      });
      this.logger.log(`OTP e-mail envoyé à ${identifier}`);
    } catch (err) {
      // Ne jamais logger le code ni les identifiants SMTP — uniquement le type d'erreur.
      this.logger.error(`Échec d'envoi SMTP pour ${identifier}: ${err instanceof Error ? err.message : 'erreur inconnue'}`);
      throw err;
    }
  }
}
