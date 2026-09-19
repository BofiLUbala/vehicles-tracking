import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, Matches, ValidateIf } from 'class-validator';
import { OtpChannel } from '@prisma/client';
import { AuthMode, PHONE_REGEX } from './request-otp.dto';

export class ResendOtpDto {
  @ApiProperty({ enum: AuthMode, required: false, default: AuthMode.LOGIN, description: 'Mode d’authentification (SIGN_UP uniquement : LOGIN répond 410 Gone)' })
  @IsOptional()
  @IsEnum(AuthMode)
  mode?: AuthMode;

  @ApiProperty({ enum: OtpChannel, required: false, default: OtpChannel.WHATSAPP, description: 'Canal d’authentification' })
  @IsOptional()
  @IsEnum(OtpChannel)
  channel?: OtpChannel;

  @ApiProperty({ example: '+243999000000', required: false, description: 'Numéro de téléphone format E.164 (requis pour canal WHATSAPP)' })
  @IsOptional()
  @ValidateIf((o) => !o.channel || o.channel === OtpChannel.WHATSAPP)
  @IsString({ message: 'Le numéro de téléphone est requis pour le canal WhatsApp' })
  @Matches(PHONE_REGEX, { message: 'Le numéro doit être au format E.164' })
  phone?: string;

  @ApiProperty({ example: 'driver@example.com', required: false, description: 'Adresse e-mail (requise pour canal EMAIL)' })
  @IsOptional()
  @ValidateIf((o) => o.channel === OtpChannel.EMAIL)
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  email?: string;

  @ApiProperty({ required: false, description: 'Identifiant unique de l’appareil' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}


