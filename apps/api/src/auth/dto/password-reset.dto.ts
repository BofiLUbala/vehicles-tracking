import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, Matches, MinLength, ValidateIf } from 'class-validator';
import { OtpChannel } from '@prisma/client';
import { PHONE_REGEX } from './request-otp.dto';

/**
 * Mot de passe oublié : OTP de récupération (chauffeur par téléphone/e-mail,
 * admin par e-mail), puis définition d'un nouveau mot de passe.
 * La connexion normale reste sans OTP.
 */
export class RequestPasswordResetDto {
  @ApiProperty({ enum: OtpChannel, required: false, default: OtpChannel.WHATSAPP, description: 'Canal de récupération' })
  @IsOptional()
  @IsEnum(OtpChannel)
  channel?: OtpChannel;

  @ApiProperty({ example: '+243999000000', required: false, description: 'Numéro de téléphone format E.164 (canal WHATSAPP)' })
  @IsOptional()
  @ValidateIf((o) => !o.channel || o.channel === OtpChannel.WHATSAPP)
  @IsString({ message: 'Le numéro de téléphone est requis pour le canal WhatsApp' })
  @Matches(PHONE_REGEX, { message: 'Le numéro doit être au format E.164, ex: +243999000000' })
  phone?: string;

  @ApiProperty({ example: 'driver@example.com', required: false, description: 'Adresse e-mail (canal EMAIL)' })
  @IsOptional()
  @ValidateIf((o) => o.channel === OtpChannel.EMAIL)
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  email?: string;
}

export class VerifyPasswordResetDto extends RequestPasswordResetDto {
  @ApiProperty({ example: '123456', description: 'Code de sécurité à 6 chiffres' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Le code doit contenir 6 chiffres' })
  code!: string;

  @ApiProperty({ description: 'Nouveau mot de passe (8 caractères minimum)' })
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  newPassword!: string;
}
