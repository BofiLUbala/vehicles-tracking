import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RedisOtpStore } from './redis-otp-store.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { OTP_SENDER_EMAIL, OTP_SENDER_WHATSAPP } from './ports/otp-sender.port';
import { StubWhatsappSender } from './senders/stub-whatsapp.sender';
import { StubEmailSender } from './senders/stub-email.sender';
import { WhatsappCloudApiSender } from './senders/whatsapp-cloud-api.sender';
import { SmtpEmailSender } from './senders/smtp-email.sender';

// Mode par canal (stub par défaut journalise les codes au lieu d'appeler des API externes).
// OTP_CHANNEL_MODE reste un interrupteur global rétrocompatible ; OTP_WHATSAPP_MODE/OTP_EMAIL_MODE
// permettent d'activer un canal en "live" indépendamment de l'autre (ex: SMTP configuré mais pas
// encore WhatsApp Cloud API).
const isWhatsappLive = (config: ConfigService) =>
  (config.get<string>('OTP_WHATSAPP_MODE') ?? config.get<string>('OTP_CHANNEL_MODE')) === 'live';
const isEmailLive = (config: ConfigService) =>
  (config.get<string>('OTP_EMAIL_MODE') ?? config.get<string>('OTP_CHANNEL_MODE')) === 'live';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}), // secrets/expiry passés explicitement à chaque sign()/verify() dans AuthService
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    RedisOtpStore,
    JwtStrategy,
    StubWhatsappSender,
    StubEmailSender,
    WhatsappCloudApiSender,
    SmtpEmailSender,
    {
      provide: OTP_SENDER_WHATSAPP,
      useFactory: (config: ConfigService, stub: StubWhatsappSender, live: WhatsappCloudApiSender) =>
        isWhatsappLive(config) ? live : stub,
      inject: [ConfigService, StubWhatsappSender, WhatsappCloudApiSender],
    },
    {
      provide: OTP_SENDER_EMAIL,
      useFactory: (config: ConfigService, stub: StubEmailSender, live: SmtpEmailSender) =>
        isEmailLive(config) ? live : stub,
      inject: [ConfigService, StubEmailSender, SmtpEmailSender],
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
