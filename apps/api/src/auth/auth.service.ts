import { BadRequestException, ForbiddenException, Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomBytes, randomInt } from 'crypto';
import { OtpChannel, OtpPurpose, RoleName } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisOtpStore } from './redis-otp-store.service';
import { OTP_SENDER_EMAIL, OTP_SENDER_WHATSAPP, OtpSenderPort } from './ports/otp-sender.port';
import { redactSensitive } from '../common/audit-log.util';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminVerifyOtpDto } from './dto/admin-verify-otp.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthenticatedPrincipal } from '../common/decorators/current-user.decorator';
import { RequestAdminActivationDto, VerifyAdminActivationDto } from './dto/activate-admin.dto';
import { RequestSuperAdminRegistrationDto, VerifySuperAdminRegistrationDto } from './dto/register-super-admin.dto';

const GENERIC_OTP_ERROR = 'Code invalide ou expiré';
const GENERIC_LOGIN_ERROR = 'Identifiants invalides';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly otpStore: RedisOtpStore,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @Inject(OTP_SENDER_WHATSAPP) private readonly whatsappSender: OtpSenderPort,
    @Inject(OTP_SENDER_EMAIL) private readonly emailSender: OtpSenderPort,
  ) {}

  private senderFor(channel: OtpChannel): OtpSenderPort {
    return channel === OtpChannel.EMAIL ? this.emailSender : this.whatsappSender;
  }

  /**
   * Les e-mails sont stockes en minuscules : toute recherche/emission d'OTP doit passer par ici,
   * sinon "Admin@Exemple.com" a la connexion ne retrouve pas le compte cree a l'inscription.
   */
  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  /**
   * En developpement uniquement (OTP_DEV_EXPOSE_CODE=true et NODE_ENV != production), le code est
   * renvoye dans la reponse pour terminer un parcours quand l'envoi e-mail est indisponible.
   */
  private get exposeDevCode(): boolean {
    return (
      this.config.get<string>('OTP_DEV_EXPOSE_CODE') === 'true' &&
      (this.config.get<string>('NODE_ENV') ?? process.env.NODE_ENV) !== 'production'
    );
  }

  private async audit(action: string, entity: string, entityId: string | undefined, metadata: Record<string, unknown>) {
    await this.prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId,
        metadata: redactSensitive(metadata) as any,
      },
    });
  }

  // ---------------------------------------------------------------------
  // OTP générique (chauffeurs par téléphone, admins par e-mail)
  // ---------------------------------------------------------------------

  private async issueOtp(
    identifier: string,
    channel: OtpChannel,
    purpose: OtpPurpose,
    deviceId: string | undefined,
    ip: string | undefined,
  ): Promise<{ devCode?: string }> {
    const cooldown = await this.otpStore.secondsUntilResendAllowed(identifier, channel);
    if (cooldown > 0) {
      throw new BadRequestException(`Veuillez patienter ${cooldown}s avant de redemander un code`);
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const codeHash = await argon2.hash(code);

    await this.otpStore.set(identifier, channel, codeHash, 5);
    const otpRequest = await this.prisma.otpRequest.create({
      data: {
        identifier,
        channel,
        purpose,
        codeHash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        deviceId,
        ipAddress: ip,
      },
    });

    try {
      await this.senderFor(channel).send(identifier, code);
    } catch (error) {
      // Un code qui n'a pas pu être envoyé ne doit être ni vérifiable, ni imposer
      // le délai anti-spam lors d'une nouvelle tentative.
      await Promise.allSettled([
        this.otpStore.consume(identifier, channel),
        this.prisma.otpRequest.delete({ where: { id: otpRequest.id } }),
      ]);
      throw error;
    }
    await this.audit('otp.requested', 'otp_request', undefined, { identifier, channel, purpose, deviceId, ip });
    return this.exposeDevCode ? { devCode: code } : {};
  }

  async requestOtp(dto: RequestOtpDto, ip?: string) {
    const channel = dto.channel ?? OtpChannel.WHATSAPP;
    await this.issueOtp(dto.phone, channel, OtpPurpose.LOGIN, dto.deviceId, ip);
    // Réponse volontairement générique : ne confirme jamais si le numéro existe.
    return { message: 'Si ce numéro est valide, un code a été envoyé.' };
  }

  async resendOtp(dto: ResendOtpDto, ip?: string) {
    await this.issueOtp(dto.phone, OtpChannel.WHATSAPP, OtpPurpose.LOGIN, dto.deviceId, ip);
    return { message: 'Si ce numéro est valide, un nouveau code a été envoyé.' };
  }

  private async verifyOtpCode(identifier: string, channel: OtpChannel, code: string): Promise<boolean> {
    const entry = await this.otpStore.get(identifier, channel);
    if (!entry) {
      await this.audit('otp.verify.failed', 'otp_request', undefined, { identifier, channel, reason: 'expired_or_missing' });
      return false;
    }
    if (entry.attempts >= entry.maxAttempts) {
      await this.audit('otp.verify.failed', 'otp_request', undefined, { identifier, channel, reason: 'max_attempts' });
      return false;
    }
    const valid = await argon2.verify(entry.codeHash, code).catch(() => false);
    if (!valid) {
      await this.otpStore.incrementAttempts(identifier, channel);
      await this.audit('otp.verify.failed', 'otp_request', undefined, { identifier, channel, reason: 'mismatch' });
      return false;
    }
    await this.otpStore.consume(identifier, channel);
    await this.prisma.otpRequest.updateMany({
      where: { identifier, channel, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    return true;
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const ok = await this.verifyOtpCode(dto.phone, OtpChannel.WHATSAPP, dto.code);
    if (!ok) throw new UnauthorizedException(GENERIC_OTP_ERROR);

    const driver = await this.prisma.driver.findUnique({ where: { phone: dto.phone } });
    if (!driver || driver.deletedAt) {
      throw new UnauthorizedException(GENERIC_OTP_ERROR);
    }
    if (driver.status !== 'ACTIVE') {
      throw new ForbiddenException('Compte chauffeur désactivé ou suspendu');
    }

    if (dto.deviceId) {
      await this.prisma.device.upsert({
        where: { deviceId: dto.deviceId },
        update: { driverId: driver.id, lastSeenAt: new Date(), revokedAt: null },
        create: { deviceId: dto.deviceId, driverId: driver.id, lastSeenAt: new Date() },
      });
    }

    const tokens = await this.issueTokenPair({
      sub: driver.id,
      type: 'driver',
      role: RoleName.DRIVER,
      organizationId: driver.organizationId,
      deviceId: dto.deviceId,
    });
    await this.audit('auth.login', 'driver', driver.id, { deviceId: dto.deviceId });
    // Le profil accompagne les jetons : l'application chauffeur affiche le nom des l'ecran suivant,
    // sans second aller-retour reseau.
    return {
      ...tokens,
      driver: {
        id: driver.id,
        firstName: driver.firstName,
        lastName: driver.lastName,
        phone: driver.phone,
        status: driver.status,
      },
    };
  }

  // ---------------------------------------------------------------------
  // Admin : mot de passe + OTP e-mail conditionnel (nouvel appareil)
  // ---------------------------------------------------------------------

  async requestSuperAdminRegistration(dto: RequestSuperAdminRegistrationDto, ip?: string) {
    const email = this.normalizeEmail(dto.email);
    const existing = await this.prisma.user.findUnique({ where: { email } });
    // L'étape de vérification refuse déjà un e-mail déjà pris : le dire ici évite d'attendre en vain
    // un code qui ne serait jamais envoyé.
    if (existing) {
      throw new BadRequestException('Un compte existe déjà pour cet e-mail. Connectez-vous ou activez votre invitation.');
    }
    const { devCode } = await this.issueOtp(email, OtpChannel.EMAIL, OtpPurpose.LOGIN, undefined, ip);
    return { message: 'Un code de vérification a été envoyé à cette adresse.', ...(devCode ? { devCode } : {}) };
  }

  async verifySuperAdminRegistration(dto: VerifySuperAdminRegistrationDto) {
    const email = this.normalizeEmail(dto.email);
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new BadRequestException('Un compte existe déjà pour cet e-mail');
    }
    const ok = await this.verifyOtpCode(email, OtpChannel.EMAIL, dto.code);
    if (!ok) throw new UnauthorizedException(GENERIC_OTP_ERROR);
    // Le rôle peut manquer si la base n'a jamais été seedée : on le crée plutôt que de renvoyer un 500.
    const role = await this.prisma.role.upsert({
      where: { name: RoleName.SUPER_ADMIN },
      update: {},
      create: { name: RoleName.SUPER_ADMIN },
    });
    // Hash calculé hors transaction : argon2 est volontairement lent, inutile de tenir la transaction ouverte.
    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: { name: `Espace de ${dto.firstName.trim()} ${dto.lastName.trim()}` },
      });
      return tx.user.create({ data: {
        organizationId: organization.id,
        email,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        passwordHash,
        roleId: role.id,
        isActive: true,
      } });
    });
    await this.audit('super_admin.registered', 'user', user.id, { email });
    return { message: 'Compte Super Master activé. Vous pouvez maintenant vous connecter.' };
  }

  async requestAdminActivation(dto: RequestAdminActivationDto, ip?: string) {
    const email = this.normalizeEmail(dto.email);
    const invited = await this.prisma.user.findUnique({ where: { email } });
    let devCode: string | undefined;
    if (invited && !invited.isActive && !invited.deletedAt) {
      ({ devCode } = await this.issueOtp(email, OtpChannel.EMAIL, OtpPurpose.LOGIN, undefined, ip));
    }
    // Réponse générique : ne confirme jamais l'existence d'une invitation.
    return { message: 'Si une invitation valide existe, un code a été envoyé.', ...(devCode ? { devCode } : {}) };
  }

  async verifyAdminActivation(dto: VerifyAdminActivationDto) {
    const email = this.normalizeEmail(dto.email);
    const invited = await this.prisma.user.findUnique({ where: { email } });
    if (!invited || invited.isActive || invited.deletedAt) throw new UnauthorizedException(GENERIC_OTP_ERROR);
    const ok = await this.verifyOtpCode(email, OtpChannel.EMAIL, dto.code);
    if (!ok) throw new UnauthorizedException(GENERIC_OTP_ERROR);
    await this.prisma.user.update({
      where: { id: invited.id },
      data: {
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        passwordHash: await argon2.hash(dto.password),
        isActive: true,
      },
    });
    await this.audit('admin.invitation.accepted', 'user', invited.id, { email });
    return { message: 'Compte activé. Vous pouvez maintenant vous connecter.' };
  }

  async adminLogin(dto: AdminLoginDto, ip?: string) {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({ where: { email }, include: { role: true } });
    if (!user || user.deletedAt || !user.isActive) {
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }
    const passwordOk = await argon2.verify(user.passwordHash, dto.password).catch(() => false);
    if (!passwordOk) {
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    // Déclencheurs OTP (TODO Phase 2+ : réinitialisation mot de passe, action sensible, connexion suspecte).
    let knownDevice = true;
    if (dto.deviceId) {
      const device = await this.prisma.device.findUnique({ where: { deviceId: dto.deviceId } });
      knownDevice = !!device && device.userId === user.id && !device.revokedAt;
    } else {
      knownDevice = false; // pas d'identifiant d'appareil fourni -> traité comme nouvel appareil
    }

    if (!knownDevice) {
      const { devCode } = await this.issueOtp(user.email, OtpChannel.EMAIL, OtpPurpose.NEW_DEVICE, dto.deviceId, ip);
      return {
        requiresOtp: true,
        message: 'Nouvel appareil détecté, un code a été envoyé par e-mail.',
        ...(devCode ? { devCode } : {}),
      };
    }

    const tokens = await this.issueTokenPair({
      sub: user.id,
      type: 'user',
      role: user.role.name,
      organizationId: user.organizationId,
      deviceId: dto.deviceId,
    });
    await this.audit('auth.login', 'user', user.id, { deviceId: dto.deviceId });
    return { requiresOtp: false, ...tokens };
  }

  async adminVerifyOtp(dto: AdminVerifyOtpDto) {
    const email = this.normalizeEmail(dto.email);
    const ok = await this.verifyOtpCode(email, OtpChannel.EMAIL, dto.code);
    if (!ok) throw new UnauthorizedException(GENERIC_OTP_ERROR);

    const user = await this.prisma.user.findUnique({ where: { email }, include: { role: true } });
    if (!user || user.deletedAt || !user.isActive) {
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    if (dto.deviceId) {
      await this.prisma.device.upsert({
        where: { deviceId: dto.deviceId },
        update: { userId: user.id, lastSeenAt: new Date(), revokedAt: null },
        create: { deviceId: dto.deviceId, userId: user.id, lastSeenAt: new Date() },
      });
    }

    const tokens = await this.issueTokenPair({
      sub: user.id,
      type: 'user',
      role: user.role.name,
      organizationId: user.organizationId,
      deviceId: dto.deviceId,
    });
    await this.audit('auth.login.new_device', 'user', user.id, { deviceId: dto.deviceId });
    return tokens;
  }

  // ---------------------------------------------------------------------
  // Tokens (access + refresh avec rotation)
  // ---------------------------------------------------------------------

  private async issueTokenPair(principal: Omit<AuthenticatedPrincipal, 'sessionId'>): Promise<TokenPair> {
    const accessSecret = this.config.get<string>('JWT_ACCESS_SECRET') || 'dev-access-secret';
    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET') || 'dev-refresh-secret';
    const accessExpiresIn = this.config.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m';
    const refreshExpiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN') || '30d';

    const family = randomBytes(16).toString('hex');
    const rawRefreshSecretPart = randomBytes(32).toString('hex');
    const refreshTokenHash = await argon2.hash(rawRefreshSecretPart);

    const expiresAt = new Date(Date.now() + this.parseDurationMs(refreshExpiresIn));
    const session = await this.prisma.userSession.create({
      data: {
        userId: principal.type === 'user' ? principal.sub : undefined,
        driverId: principal.type === 'driver' ? principal.sub : undefined,
        deviceId: principal.deviceId,
        refreshTokenHash,
        family,
        expiresAt,
      },
    });

    const accessToken = this.jwt.sign(
      { sub: principal.sub, type: principal.type, role: principal.role, organizationId: principal.organizationId, deviceId: principal.deviceId },
      { secret: accessSecret, expiresIn: accessExpiresIn },
    );
    const refreshToken = this.jwt.sign(
      { sessionId: session.id, secret: rawRefreshSecretPart },
      { secret: refreshSecret, expiresIn: refreshExpiresIn },
    );

    return { accessToken, refreshToken };
  }

  private parseDurationMs(duration: string): number {
    const match = /^(\d+)([smhd])$/.exec(duration);
    if (!match) return 30 * 24 * 60 * 60 * 1000;
    const value = Number(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    return value * multipliers[unit];
  }

  async refresh(dto: RefreshDto) {
    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET') || 'dev-refresh-secret';
    let payload: { sessionId: string; secret: string };
    try {
      payload = this.jwt.verify(dto.refreshToken, { secret: refreshSecret });
    } catch {
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }

    const session = await this.prisma.userSession.findUnique({ where: { id: payload.sessionId } });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session invalide ou expirée');
    }

    const secretOk = await argon2.verify(session.refreshTokenHash, payload.secret).catch(() => false);
    if (!secretOk) {
      // Rejeu détecté : on révoque toute la famille de sessions par précaution.
      await this.prisma.userSession.updateMany({ where: { family: session.family }, data: { revokedAt: new Date() } });
      await this.audit('auth.refresh.reuse_detected', 'user_session', session.id, {});
      throw new UnauthorizedException('Session invalide ou expirée');
    }

    let role: RoleName;
    let organizationId: string;
    let type: 'user' | 'driver';
    let sub: string;
    if (session.userId) {
      const user = await this.prisma.user.findUnique({ where: { id: session.userId }, include: { role: true } });
      if (!user || user.deletedAt || !user.isActive) throw new UnauthorizedException('Session invalide ou expirée');
      role = user.role.name;
      organizationId = user.organizationId;
      type = 'user';
      sub = user.id;
    } else if (session.driverId) {
      const driver = await this.prisma.driver.findUnique({ where: { id: session.driverId } });
      if (!driver || driver.deletedAt || driver.status !== 'ACTIVE') throw new UnauthorizedException('Session invalide ou expirée');
      role = RoleName.DRIVER;
      organizationId = driver.organizationId;
      type = 'driver';
      sub = driver.id;
    } else {
      throw new UnauthorizedException('Session invalide ou expirée');
    }

    const tokens = await this.issueTokenPair({ sub, type, role, organizationId, deviceId: session.deviceId ?? undefined });
    await this.prisma.userSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    return tokens;
  }

  async logout(dto: RefreshDto) {
    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET') || 'dev-refresh-secret';
    try {
      const payload = this.jwt.verify<{ sessionId: string }>(dto.refreshToken, { secret: refreshSecret });
      await this.prisma.userSession.update({ where: { id: payload.sessionId }, data: { revokedAt: new Date() } });
    } catch {
      // Déconnexion idempotente : un token déjà invalide ne doit pas faire échouer le logout.
    }
    return { message: 'Déconnecté' };
  }

  // ---------------------------------------------------------------------
  // Profil / mot de passe
  // ---------------------------------------------------------------------

  async getProfile(principal: AuthenticatedPrincipal) {
    if (principal.type === 'driver') {
      const driver = await this.prisma.driver.findUnique({ where: { id: principal.sub } });
      if (!driver) throw new UnauthorizedException();
      const { ...safe } = driver;
      return { type: 'driver', ...safe };
    }
    const user = await this.prisma.user.findUnique({ where: { id: principal.sub }, include: { role: true } });
    if (!user) throw new UnauthorizedException();
    const { passwordHash, ...safe } = user;
    return { type: 'user', ...safe };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const ok = await argon2.verify(user.passwordHash, dto.currentPassword).catch(() => false);
    if (!ok) throw new BadRequestException('Mot de passe actuel incorrect');
    const newHash = await argon2.hash(dto.newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });
    await this.audit('auth.password_changed', 'user', userId, {});
    return { message: 'Mot de passe mis à jour' };
  }
}
