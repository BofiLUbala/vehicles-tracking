import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, Matches, MinLength, ValidateIf } from 'class-validator';
import { OtpChannel } from '@prisma/client';
import { AuthMode, PHONE_REGEX } from './request-otp.dto';

export class VerifyOtpDto {
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

  @ApiProperty({ example: '123456', description: 'Code de sécurité à 6 chiffres' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Le code doit contenir 6 chiffres' })
  code!: string;

  @ApiProperty({ required: false, description: 'Mot de passe (requis pour finaliser l’inscription SIGN_UP : 8 caractères minimum)' })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  password?: string;

  @ApiProperty({ example: 'Gauthier', required: false, description: 'Prénom (utilisé pour finaliser l’inscription)' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ example: 'Bofi', required: false, description: 'Nom (utilisé pour finaliser l’inscription)' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false, description: 'Identifiant unique de l’appareil' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}


