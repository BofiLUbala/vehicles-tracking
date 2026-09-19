import { BadRequestException, ForbiddenException, GoneException, Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomBytes, randomInt } from 'crypto';
import { OtpChannel, OtpPurpose, RoleName } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisOtpStore } from './redis-otp-store.service';
import { OTP_SENDER_EMAIL, OTP_SENDER_WHATSAPP, OtpSenderPort } from './ports/otp-sender.port';
import { redactSensitive } from '../common/audit-log.util';
import { RequestOtpDto, AuthMode } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { DriverLoginDto } from './dto/driver-login.dto';
import { RequestPasswordResetDto, VerifyPasswordResetDto } from './dto/password-reset.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthenticatedPrincipal } from '../common/decorators/current-user.decorator';
import { RequestAdminActivationDto, VerifyAdminActivationDto } from './dto/activate-admin.dto';
import { RequestSuperAdminRegistrationDto, VerifySuperAdminRegistrationDto } from './dto/register-super-admin.dto';

const GENERIC_OTP_ERROR = 'Code invalide ou expiré';
const GENERIC_LOGIN_ERROR = 'Identifiants invalides';
/** L'OTP n'est plus un moyen de connexion : il ne sert qu'à l'activation / la récupération. */
const LOGIN_OTP_GONE_MESSAGE =
  'La connexion par code n’est plus disponible. Connectez-vous avec votre mot de passe.';
const PENDING_ACCOUNT_MESSAGE = 'Veuillez d’abord vérifier votre compte.';
const PASSWORD_MIN_LENGTH = 8;

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

  private async audit(
    action: string,
    entity: string,
    entityId: string | undefined,
    metadata: Record<string, unknown>,
    actorId?: string,
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorId,
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

  // ---------------------------------------------------------------------
  // OTP générique (chauffeurs par téléphone ou e-mail, admins par e-mail)
  // ---------------------------------------------------------------------

  private async issueOtp(
    identifier: string,
    channel: OtpChannel,
    purpose: OtpPurpose,
    deviceId: string | undefined,
    ip: string | undefined,
    mode: string = 'LOGIN',
  ): Promise<{ devCode?: string }> {
    const cooldown = await this.otpStore.secondsUntilResendAllowed(identifier, channel, mode);
    if (cooldown > 0) {
      throw new BadRequestException(`Veuillez patienter ${cooldown}s avant de redemander un code`);
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const codeHash = await argon2.hash(code);

    await this.otpStore.set(identifier, channel, codeHash, 5, mode);
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
        this.otpStore.consume(identifier, channel, mode),
        this.prisma.otpRequest.delete({ where: { id: otpRequest.id } }),
      ]);
      throw error;
    }
    await this.audit('otp.requested', 'otp_request', undefined, { identifier, channel, purpose, mode, deviceId, ip });
    return this.exposeDevCode ? { devCode: code } : {};
  }

  async requestOtp(dto: RequestOtpDto, ip?: string) {
    // L'OTP n'est plus un moyen de connexion : il ne sert qu'à l'activation (SIGN_UP).
    if ((dto.mode ?? AuthMode.LOGIN) === AuthMode.LOGIN) {
      throw new GoneException(LOGIN_OTP_GONE_MESSAGE);
    }
    const mode = dto.mode ?? 'LOGIN';
    const channel = dto.channel ?? OtpChannel.WHATSAPP;
    const identifier =
      channel === OtpChannel.EMAIL
        ? this.normalizeEmail(dto.email ?? '')
        : (dto.phone ?? '');
    if (!identifier) {
      throw new BadRequestException(
        channel === OtpChannel.EMAIL
          ? 'Une adresse e-mail valide est requise'
          : 'Un numéro de téléphone valide est requis',
      );
    }

    if (mode === 'SIGN_UP') {
      // Vérification que le compte n'existe pas déjà
      if (channel === OtpChannel.WHATSAPP) {
        const existingDriver = await this.prisma.driver.findFirst({
          where: { phone: identifier, deletedAt: null, status: 'ACTIVE' },
        });
        if (existingDriver) {
          throw new BadRequestException('Un compte existe déjà avec ce numéro de téléphone. Connectez-vous.');
        }
      } else {
        const [existingDriver, existingUser] = await Promise.all([
          this.prisma.driver.findFirst({ where: { email: identifier, deletedAt: null, status: 'ACTIVE' } }),
          this.prisma.user.findFirst({ where: { email: identifier, deletedAt: null, isActive: true } }),
        ]);
        if (existingDriver || existingUser) {
          throw new BadRequestException('Un compte existe déjà avec cette adresse e-mail. Connectez-vous.');
        }
      }
    }

    const { devCode } = await this.issueOtp(identifier, channel, OtpPurpose.LOGIN, dto.deviceId, ip, mode);
    return {
      message:
        channel === OtpChannel.EMAIL
          ? 'Si cette adresse e-mail est valide, un code de sécurité à 6 chiffres a été envoyé.'
          : 'Si ce numéro est valide, un code de sécurité à 6 chiffres a été envoyé.',
      ...(devCode ? { devCode } : {}),
    };
  }

  async resendOtp(dto: ResendOtpDto, ip?: string) {
    if ((dto.mode ?? AuthMode.LOGIN) === AuthMode.LOGIN) {
      throw new GoneException(LOGIN_OTP_GONE_MESSAGE);
    }
    const mode = dto.mode ?? 'LOGIN';
    const channel = dto.channel ?? OtpChannel.WHATSAPP;
    const identifier =
      channel === OtpChannel.EMAIL
        ? this.normalizeEmail(dto.email ?? '')
        : (dto.phone ?? '');
    if (!identifier) {
      throw new BadRequestException(
        channel === OtpChannel.EMAIL
          ? 'Une adresse e-mail valide est requise'
          : 'Un numéro de téléphone valide est requis',
      );
    }
    const { devCode } = await this.issueOtp(identifier, channel, OtpPurpose.LOGIN, dto.deviceId, ip, mode);
    return {
      message:
        channel === OtpChannel.EMAIL
          ? 'Si cette adresse e-mail est valide, un nouveau code a été envoyé.'
          : 'Si ce numéro est valide, un nouveau code a été envoyé.',
      ...(devCode ? { devCode } : {}),
    };
  }

  private async verifyOtpCode(identifier: string, channel: OtpChannel, code: string, mode = 'LOGIN'): Promise<boolean> {
    const entry = await this.otpStore.get(identifier, channel, mode);
    if (!entry) {
      await this.audit('otp.verify.failed', 'otp_request', undefined, { identifier, channel, mode, reason: 'expired_or_missing' });
      return false;
    }
    if (entry.attempts >= entry.maxAttempts) {
      await this.audit('otp.verify.failed', 'otp_request', undefined, { identifier, channel, mode, reason: 'max_attempts' });
      return false;
    }
    const valid = await argon2.verify(entry.codeHash, code).catch(() => false);
    if (!valid) {
      await this.otpStore.incrementAttempts(identifier, channel, mode);
      await this.audit('otp.verify.failed', 'otp_request', undefined, { identifier, channel, mode, reason: 'mismatch' });
      return false;
    }
    await this.otpStore.consume(identifier, channel, mode);
    await this.prisma.otpRequest.updateMany({
      where: { identifier, channel, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    return true;
  }

  async verifyOtp(dto: VerifyOtpDto) {
    // L'OTP n'est plus un moyen de connexion : il ne sert qu'à l'activation (SIGN_UP).
    if ((dto.mode ?? AuthMode.LOGIN) === AuthMode.LOGIN) {
      throw new GoneException(LOGIN_OTP_GONE_MESSAGE);
    }
    const mode = dto.mode ?? 'LOGIN';
    const channel = dto.channel ?? OtpChannel.WHATSAPP;
    const identifier =
      channel === OtpChannel.EMAIL
        ? this.normalizeEmail(dto.email ?? '')
        : (dto.phone ?? '');
    if (!identifier) {
      throw new BadRequestException(
        channel === OtpChannel.EMAIL
          ? 'Une adresse e-mail valide est requise'
          : 'Un numéro de téléphone valide est requis',
      );
    }

    const ok = await this.verifyOtpCode(identifier, channel, dto.code, mode);
    if (!ok) throw new UnauthorizedException(GENERIC_OTP_ERROR);

    if (mode === 'SIGN_UP') {
      // Activation unique du compte : l'OTP prouve la propriété de l'identifiant, le mot de passe
      // sert ensuite aux connexions normales (sans OTP).
      if (!dto.password || dto.password.length < PASSWORD_MIN_LENGTH) {
        throw new BadRequestException('Un mot de passe d’au moins 8 caractères est requis pour activer le compte');
      }
      // Inscription d'un nouveau chauffeur dans l'organisation
      let organization = await this.prisma.organization.findFirst();
      if (!organization) {
        organization = await this.prisma.organization.create({
          data: {
            id: '00000000-0000-0000-0000-000000000001',
            name: 'Régie de collecte des déchets — Kinshasa',
          },
        });
      }

      let driver = channel === OtpChannel.WHATSAPP
        ? await this.prisma.driver.findFirst({ where: { phone: identifier } })
        : await this.prisma.driver.findFirst({ where: { email: identifier } });

      if (driver) {
        driver = await this.prisma.driver.update({
          where: { id: driver.id },
          data: {
            firstName: dto.firstName?.trim() || driver.firstName,
            lastName: dto.lastName?.trim() || driver.lastName,
            passwordHash: await argon2.hash(dto.password),
            status: 'ACTIVE',
            deletedAt: null,
          },
        });
      } else {
        driver = await this.prisma.driver.create({
          data: {
            organizationId: organization.id,
            firstName: dto.firstName?.trim() || 'Chauffeur',
            lastName: dto.lastName?.trim() || '',
            phone: channel === OtpChannel.WHATSAPP ? identifier : dto.phone || null,
            email: channel === OtpChannel.EMAIL ? identifier : dto.email ? this.normalizeEmail(dto.email) : null,
            passwordHash: await argon2.hash(dto.password),
            status: 'ACTIVE',
          },
        });
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
      await this.audit('auth.signup', 'driver', driver.id, { deviceId: dto.deviceId, channel }, driver.id);
      return {
        ...tokens,
        driver: {
          id: driver.id,
          firstName: driver.firstName,
          lastName: driver.lastName,
          phone: driver.phone || '',
          email: driver.email || '',
          status: driver.status,
        },
      };
    }

    // L'OTP ne sert plus à la connexion : toute demande LOGIN est rejetée en tête de méthode.
    throw new GoneException(LOGIN_OTP_GONE_MESSAGE);
  }

  // ---------------------------------------------------------------------
  // Chauffeur : connexion par identifiant + mot de passe (sans OTP)
  // ---------------------------------------------------------------------

  async driverLogin(dto: DriverLoginDto, ip?: string) {
    const identifier = dto.phone ?? (dto.email ? this.normalizeEmail(dto.email) : '');
    if (!identifier) {
      throw new BadRequestException('Un numéro de téléphone ou une adresse e-mail est requis');
    }
    const driver = dto.phone
      ? await this.prisma.driver.findFirst({ where: { phone: dto.phone, deletedAt: null } })
      : await this.prisma.driver.findFirst({ where: { email: identifier, deletedAt: null } });
    if (!driver) {
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }
    if (driver.status === 'PENDING_VERIFICATION') {
      throw new ForbiddenException(PENDING_ACCOUNT_MESSAGE);
    }
    if (driver.status !== 'ACTIVE') {
      throw new ForbiddenException('Compte chauffeur désactivé ou suspendu');
    }
    if (!driver.passwordHash) {
      throw new ForbiddenException('Aucun mot de passe défini pour ce compte. Utilisez « Mot de passe oublié » pour en créer un.');
    }
    const passwordOk = await argon2.verify(driver.passwordHash, dto.password).catch(() => false);
    if (!passwordOk) {
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
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
    await this.audit('auth.login', 'driver', driver.id, { deviceId: dto.deviceId, ip }, driver.id);
    return {
      ...tokens,
      driver: {
        id: driver.id,
        firstName: driver.firstName,
        lastName: driver.lastName,
        phone: driver.phone || '',
        email: driver.email || '',
        status: driver.status,
      },
    };
  }

  // ---------------------------------------------------------------------
  // Mot de passe oublié : OTP de récupération (seul usage d'OTP hors activation)
  // ---------------------------------------------------------------------

  async requestPasswordReset(dto: RequestPasswordResetDto, ip?: string) {
    const channel = dto.channel ?? OtpChannel.WHATSAPP;
    const identifier =
      channel === OtpChannel.EMAIL
        ? this.normalizeEmail(dto.email ?? '')
        : (dto.phone ?? '');
    if (!identifier) {
      throw new BadRequestException(
        channel === OtpChannel.EMAIL
          ? 'Une adresse e-mail valide est requise'
          : 'Un numéro de téléphone valide est requis',
      );
    }

    let accountFound = false;
    if (channel === OtpChannel.WHATSAPP) {
      accountFound = !!(await this.prisma.driver.findFirst({
        where: { phone: identifier, status: 'ACTIVE', deletedAt: null },
      }));
    } else {
      const [driver, user] = await Promise.all([
        this.prisma.driver.findFirst({ where: { email: identifier, status: 'ACTIVE', deletedAt: null } }),
        this.prisma.user.findFirst({ where: { email: identifier, isActive: true, deletedAt: null } }),
      ]);
      accountFound = !!(driver || user);
    }

    let devCode: string | undefined;
    if (accountFound) {
      ({ devCode } = await this.issueOtp(identifier, channel, OtpPurpose.PASSWORD_RESET, undefined, ip, 'PASSWORD_RESET'));
    }
    // Réponse générique : ne confirme jamais l'existence du compte.
    return { message: 'Si ce compte existe et est actif, un code de récupération a été envoyé.', ...(devCode ? { devCode } : {}) };
  }

  async verifyPasswordReset(dto: VerifyPasswordResetDto, ip?: string) {
    const channel = dto.channel ?? OtpChannel.WHATSAPP;
    const identifier =
      channel === OtpChannel.EMAIL
        ? this.normalizeEmail(dto.email ?? '')
        : (dto.phone ?? '');
    if (!identifier) {
      throw new BadRequestException(
        channel === OtpChannel.EMAIL
          ? 'Une adresse e-mail valide est requise'
          : 'Un numéro de téléphone valide est requis',
      );
    }

    const ok = await this.verifyOtpCode(identifier, channel, dto.code, 'PASSWORD_RESET');
    if (!ok) throw new UnauthorizedException(GENERIC_OTP_ERROR);

    const passwordHash = await argon2.hash(dto.newPassword);
    if (channel === OtpChannel.WHATSAPP) {
      const driver = await this.prisma.driver.findFirst({ where: { phone: identifier, status: 'ACTIVE', deletedAt: null } });
      if (!driver) throw new UnauthorizedException(GENERIC_OTP_ERROR);
      await this.prisma.driver.update({ where: { id: driver.id }, data: { passwordHash } });
      await this.prisma.userSession.updateMany({ where: { driverId: driver.id, revokedAt: null }, data: { revokedAt: new Date() } });
      await this.audit('auth.password_reset.completed', 'driver', driver.id, { channel, ip }, driver.id);
    } else {
      const driver = await this.prisma.driver.findFirst({ where: { email: identifier, status: 'ACTIVE', deletedAt: null } });
      const user = driver
        ? null
        : await this.prisma.user.findFirst({ where: { email: identifier, isActive: true, deletedAt: null } });
      if (driver) {
        await this.prisma.driver.update({ where: { id: driver.id }, data: { passwordHash } });
        await this.prisma.userSession.updateMany({ where: { driverId: driver.id, revokedAt: null }, data: { revokedAt: new Date() } });
        await this.audit('auth.password_reset.completed', 'driver', driver.id, { channel, ip }, driver.id);
      } else if (user) {
        await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
        await this.prisma.userSession.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
        await this.audit('auth.password_reset.completed', 'user', user.id, { channel, ip }, user.id);
      } else {
        throw new UnauthorizedException(GENERIC_OTP_ERROR);
      }
    }
    return { message: 'Mot de passe réinitialisé. Vous pouvez maintenant vous connecter.' };
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
    await this.audit('super_admin.registered', 'user', user.id, { email }, user.id);
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
    await this.audit('admin.invitation.accepted', 'user', invited.id, { email }, invited.id);
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

    // La connexion admin est e-mail + mot de passe, sans OTP : l'appareil est simplement enregistré.
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
    await this.audit('auth.login', 'user', user.id, { deviceId: dto.deviceId, ip }, user.id);
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
      await this.audit('auth.refresh.reuse_detected', 'user_session', session.id, {}, session.userId ?? session.driverId ?? undefined);
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
      const driver = await this.prisma.driver.findUnique({
        where: { id: principal.sub },
        include: { organization: { select: { id: true, name: true } } },
      });
      if (!driver) throw new UnauthorizedException();
      const { organization, passwordHash: _passwordHash, ...safe } = driver;
      void _passwordHash;
      return { type: 'driver', ...safe, organizationName: organization?.name ?? null };
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
    await this.audit('auth.password_changed', 'user', userId, {}, userId);
    return { message: 'Mot de passe mis à jour' };
  }
}
