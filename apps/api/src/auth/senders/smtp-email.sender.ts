import { Injectable, Logger, NotImplementedException, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpChannel } from '@prisma/client';
import { promises as dnsPromises } from 'dns';
import { isIP } from 'net';
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
  private transporterInit?: Promise<Transporter>;
  private warmup?: Promise<void>;

  constructor(private readonly config: ConfigService) {}

  private num(key: string, fallback: number): number {
    return Number(this.config.get<string>(key)) || fallback;
  }

  /** Pré-chauffe la connexion SMTP en arrière-plan (n'empêche jamais l'API de démarrer). */
  onModuleInit() {
    if (!this.config.get<string>('SMTP_HOST')) return;
    this.warmup = this.getTransporter()
      .then((transporter) => transporter.verify())
      .then(() => {
        this.logger.log('Connexion SMTP vérifiée et prête');
      })
      .catch((err) => {
        this.logger.warn(`Warm-up SMTP échoué (réessai au premier envoi) : ${err instanceof Error ? err.message : 'erreur inconnue'}`);
      });
  }

  private assertConfigured(): string {
    const host = this.config.get<string>('SMTP_HOST');
    if (!host) {
      throw new NotImplementedException(
        "Envoi e-mail réel non configuré (SMTP_HOST manquant) — renseigner SMTP_HOST/PORT/USER/PASSWORD/FROM",
      );
    }
    return host;
  }

  /**
   * Résout le nom d'hôte SMTP avec le résolveur du SYSTÈME (getaddrinfo) et renvoie l'adresse IP.
   *
   * Pourquoi : nodemailer résout les noms avec `dns.resolve4/resolve6` (c-ares), qui interroge
   * directement les serveurs DNS configurés dans Node. Sur certains postes (DNS local 127.0.0.1 : VPN,
   * proxy, DNS filtrant) ces requêtes ne reçoivent JAMAIS de réponse alors que `dns.lookup` répond en
   * quelques ms. Résultat constaté en conditions réelles : chaque envoi restait bloqué jusqu'à
   * SMTP_SEND_TIMEOUT_MS sans jamais ouvrir de connexion, et l'API renvoyait « service indisponible ».
   * On se connecte donc à l'IP en conservant le nom d'hôte pour la validation du certificat TLS.
   */
  private async resolveHost(host: string): Promise<{ host: string; servername?: string }> {
    if (isIP(host)) return { host };
    try {
      const family = this.config.get<string>('SMTP_IPV4_ONLY') === 'true' ? 4 : 0;
      const timeoutMs = this.num('SMTP_CONNECTION_TIMEOUT_MS', 30_000);
      const { address } = await Promise.race([
        dnsPromises.lookup(host, { family }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('délai de résolution DNS dépassé')), timeoutMs).unref()),
      ]);
      return { host: address, servername: host };
    } catch (err) {
      // Repli : laisser nodemailer essayer avec le nom (comportement d'origine).
      this.logger.warn(`Résolution DNS système impossible pour ${host} (${err instanceof Error ? err.message : 'erreur'}) — repli sur le résolveur de nodemailer`);
      return { host };
    }
  }

  private getTransporter(): Promise<Transporter> {
    if (this.transporter) return Promise.resolve(this.transporter);
    if (!this.transporterInit) {
      this.transporterInit = this.createTransporter().then(
        (transporter) => {
          this.transporter = transporter;
          return transporter;
        },
        (err) => {
          this.transporterInit = undefined;
          throw err;
        },
      );
    }
    return this.transporterInit;
  }

  private async createTransporter(): Promise<Transporter> {
    const configuredHost = this.assertConfigured();
    const target = await this.resolveHost(configuredHost);

    const port = this.num('SMTP_PORT', 587);
    return nodemailer.createTransport({
      host: target.host,
      // Connexion par IP : le certificat doit rester validé contre le NOM d'hôte d'origine.
      ...(target.servername ? { tls: { servername: target.servername } } : {}),
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
  }

  /** Ferme le pool et force la reconstruction d'un transport propre au prochain envoi. */
  private resetTransporter() {
    try {
      this.transporter?.close();
    } catch {
      /* le transport peut déjà être fermé */
    }
    this.transporter = undefined;
    this.transporterInit = undefined;
    this.warmup = undefined;
  }

  async send(identifier: string, code: string): Promise<void> {
    const from = this.config.get<string>('SMTP_FROM') || this.config.get<string>('SMTP_USER');
    this.assertConfigured();

    try {
      // Le warm-up éventuellement en cours fait partie du délai global : attendre la connexion évite
      // de payer la poignée de main TLS ici, sans jamais bloquer au-delà de SMTP_SEND_TIMEOUT_MS.
      const send = (async () => {
        const transporter = await this.getTransporter();
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

  /**
   * Lien chauffeur (`/activate` ou `/reset-password`) avec son jeton. Le Worker Cloudflare `track`
   * sert ces pages et `/.well-known/assetlinks.json` : sur Android, le lien ouvre directement l'app.
   */
  driverAppLink(path: 'activate' | 'reset-password', token: string): string {
    const base = (this.config.get<string>('DRIVER_APP_LINK_BASE_URL')?.trim() || 'https://track.bofigauthier3.workers.dev').replace(/\/+$/, '');
    return `${base}/${path}?token=${encodeURIComponent(token)}`;
  }

  /** E-mail contenant un bouton vers un lien chauffeur (texte brut + HTML). */
  private async sendDriverLinkEmail(
    email: string,
    firstName: string,
    subject: string,
    intro: string,
    buttonLabel: string,
    link: string,
    validity: string,
  ): Promise<void> {
    const safeName = firstName.replace(/[<>&"']/g, '');
    const transporter = await this.getTransporter();
    await transporter.sendMail({
      from: this.config.get<string>('SMTP_FROM') || this.config.get<string>('SMTP_USER'),
      to: email,
      subject,
      text: `Bonjour ${firstName},\n\n${intro}\n\n${buttonLabel} : ${link}\n\nOuvrez ce lien sur votre téléphone Android. Si l'application n'est pas encore installée, le lien vous propose de l'installer. ${validity}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
      html: `<p>Bonjour ${safeName},</p>
<p>${intro}</p>
<p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#0B8FCB;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600">${buttonLabel}</a></p>
<p style="color:#555;font-size:13px">Ouvrez ce lien sur votre téléphone Android. Si le bouton ne fonctionne pas, copiez ce lien :<br><a href="${link}">${link}</a></p>
<p style="color:#555;font-size:13px">Si l'application n'est pas encore installée, le lien vous propose de l'installer. ${validity}</p>
<p style="color:#555;font-size:13px">Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>`,
    });
  }

  async sendDriverInvitation(email: string, firstName: string, token: string): Promise<void> {
    try {
      await this.sendDriverLinkEmail(
        email,
        firstName,
        'Activez votre compte chauffeur Tracking Vehicles',
        "Votre organisation vous invite à utiliser l'application mobile Tracking Vehicles. Touchez le bouton ci-dessous pour activer votre compte et choisir votre mot de passe.",
        'Activer mon compte',
        this.driverAppLink('activate', token),
        'Ce lien est personnel et valable 7 jours.',
      );
    } catch (err) {
      this.logger.error(`Échec d'invitation SMTP pour ${email}: ${err instanceof Error ? err.message : 'erreur inconnue'}`);
      throw new ServiceUnavailableException("Le service d’envoi d’e-mail est momentanément indisponible. Réessayez dans quelques instants.");
    }
  }

  async sendDriverPasswordReset(email: string, firstName: string, token: string): Promise<void> {
    try {
      await this.sendDriverLinkEmail(
        email,
        firstName,
        'Réinitialisez votre mot de passe Tracking Vehicles',
        'Vous avez demandé à réinitialiser le mot de passe de votre compte chauffeur. Touchez le bouton ci-dessous pour en choisir un nouveau.',
        'Choisir un nouveau mot de passe',
        this.driverAppLink('reset-password', token),
        'Ce lien est personnel et valable 1 heure.',
      );
    } catch (err) {
      this.logger.error(`Échec d'envoi du lien de réinitialisation pour ${email}: ${err instanceof Error ? err.message : 'erreur inconnue'}`);
      throw new ServiceUnavailableException("Le service d’envoi d’e-mail est momentanément indisponible. Réessayez dans quelques instants.");
    }
  }


}
