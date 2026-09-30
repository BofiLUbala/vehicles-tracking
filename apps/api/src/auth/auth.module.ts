import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RedisOtpStore } from './redis-otp-store.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TrackingModule } from '../tracking/tracking.module';
import { OTP_SENDER_EMAIL } from './ports/otp-sender.port';
import { StubEmailSender } from './senders/stub-email.sender';
import { SmtpEmailSender } from './senders/smtp-email.sender';
import { FallbackEmailSender } from './senders/fallback-email.sender';

// Codes OTP par e-mail (comptes admin uniquement) : `stub` journalise le code au lieu de l'envoyer.
// OTP_EMAIL_MODE prime sur l'interrupteur global rétrocompatible OTP_CHANNEL_MODE.
// Les chauffeurs ne reçoivent jamais de code : uniquement des liens par e-mail (SmtpEmailSender).
const isEmailLive = (config: ConfigService) =>
  (config.get<string>('OTP_EMAIL_MODE') ?? config.get<string>('OTP_CHANNEL_MODE')) === 'live';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}), // secrets/expiry passés explicitement à chaque sign()/verify() dans AuthService
    TrackingModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    RedisOtpStore,
    JwtStrategy,
    StubEmailSender,
    SmtpEmailSender,
    FallbackEmailSender,
    {
      provide: OTP_SENDER_EMAIL,
      useFactory: (config: ConfigService, stub: StubEmailSender, live: FallbackEmailSender) =>
        isEmailLive(config) ? live : stub,
      inject: [ConfigService, StubEmailSender, FallbackEmailSender],
    },
  ],
  exports: [AuthService, SmtpEmailSender],
})
export class AuthModule {}
