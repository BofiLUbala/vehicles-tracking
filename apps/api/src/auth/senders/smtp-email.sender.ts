import { Injectable, Logger, NotImplementedException, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpChannel } from '@prisma/client';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { OtpSenderPort } from '../ports/otp-sender.port';

/**
 * Implémentation "live" par e-mail (SMTP, via nodemailer — compatible Gmail, Amazon SES, Brevo,
 * Mailgun, etc. per spec section 3). Activée quand OTP_CHANNEL_MODE=live et SMTP_HOST est renseigné.
 *
 * La connexion est mise en pool et pré-chauffée au démarrage : sur certains postes (antivirus qui
 * inspecte le TLS, réseau filtrant) la toute première poignée de main TLS avec le serveur SMTP peut
 * prendre plus d'une minute, ce qui ferait échouer la première requête d'un utilisateur. Le warm-up
 * paie ce coût hors requête HTTP, et le pool réutilise ensuite la connexion.
 */
@Injectable()
export class SmtpEmailSender implements OtpSenderPort, OnModuleInit, OnModuleDestroy {
  readonly channel = OtpChannel.EMAIL;
  private readonly logger = new Logger('SmtpEmailSender');
  private transporter?: Transporter;
  private warmup?: Promise<void>;

  constructor(private readonly config: ConfigService) {}

  private num(key: string, fallback: number): number {
    return Number(this.config.get<string>(key)) || fallback;
  }

  /** Pré-chauffe la connexion SMTP en arrière-plan (n'empêche jamais l'API de démarrer). */
  onModuleInit() {
    if (!this.config.get<string>('SMTP_HOST')) return;
    this.warmup = this.getTransporter()
      .verify()
      .then(() => {
        this.logger.log('Connexion SMTP vérifiée et prête');
      })
      .catch((err) => {
        this.logger.warn(`Warm-up SMTP échoué (réessai au premier envoi) : ${err instanceof Error ? err.message : 'erreur inconnue'}`);
      });
  }

  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter;

    const host = this.config.get<string>('SMTP_HOST');
    if (!host) {
      throw new NotImplementedException(
        "Envoi e-mail réel non configuré (SMTP_HOST manquant) — renseigner SMTP_HOST/PORT/USER/PASSWORD/FROM",
      );
    }

    const port = this.num('SMTP_PORT', 587);
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // STARTTLS implicite sur 587/25, TLS direct sur 465
      pool: true,
      maxConnections: 1,
      // Certains réseaux résolvent le SMTP en IPv6 sans route utilisable : SMTP_IPV4_ONLY=true force l'IPv4.
      ...(this.config.get<string>('SMTP_IPV4_ONLY') === 'true' ? { family: 4 } : {}),
      connectionTimeout: this.num('SMTP_CONNECTION_TIMEOUT_MS', 30_000),
      greetingTimeout: this.num('SMTP_CONNECTION_TIMEOUT_MS', 30_000),
      socketTimeout: this.num('SMTP_SOCKET_TIMEOUT_MS', 45_000),
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASSWORD'),
      },
    });
    return this.transporter;
  }

  /** Ferme le pool et force la reconstruction d'un transport propre au prochain envoi. */
  private resetTransporter() {
    try {
      this.transporter?.close();
    } catch {
      /* le transport peut déjà être fermé */
    }
    this.transporter = undefined;
    this.warmup = undefined;
  }

  async send(identifier: string, code: string): Promise<void> {
    const from = this.config.get<string>('SMTP_FROM') || this.config.get<string>('SMTP_USER');
    const transporter = this.getTransporter();

    try {
      // Le warm-up éventuellement en cours fait partie du délai global : attendre la connexion évite
      // de payer la poignée de main TLS ici, sans jamais bloquer au-delà de SMTP_SEND_TIMEOUT_MS.
      const send = (async () => {
        if (this.warmup) await this.warmup.catch(() => undefined);
        return transporter.sendMail({
          from,
          to: identifier,
          subject: 'Votre code de vérification Tracking Vehicles',
          text: `Votre code Tracking Vehicles est : ${code}\nIl expire dans 5 minutes.\nNe partagez ce code avec personne.`,
          html: `<p>Votre code Tracking Vehicles est : <strong>${code}</strong></p><p>Il expire dans 5 minutes.<br/>Ne partagez ce code avec personne.</p>`,
        });
      })();
      const timeoutMs = this.num('SMTP_SEND_TIMEOUT_MS', 30_000);
      let timeout: NodeJS.Timeout | undefined;
      let timedOut = false;
      try {
        await Promise.race([
          send,
          new Promise<never>((_, reject) => {
            timeout = setTimeout(() => {
              timedOut = true;
              reject(new Error(`délai SMTP dépassé après ${timeoutMs} ms`));
            }, timeoutMs);
          }),
        ]);
      } finally {
        if (timeout) clearTimeout(timeout);
        if (timedOut) this.resetTransporter();
      }
      this.logger.log(`OTP e-mail envoyé à ${identifier}`);
    } catch (err) {
      // Ne jamais logger le code ni les identifiants SMTP — uniquement le type d'erreur.
      this.logger.error(`Échec d'envoi SMTP pour ${identifier}: ${err instanceof Error ? err.message : 'erreur inconnue'}`);
      throw new ServiceUnavailableException(
        "Le service d’envoi d’e-mail est momentanément indisponible. Réessayez dans quelques instants.",
      );
    }
  }

  onModuleDestroy() {
    this.resetTransporter();
  }
}
