import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches } from 'class-validator';
import { PHONE_REGEX } from './request-otp.dto';

/**
 * Connexion chauffeur par identifiant + mot de passe (l'OTP ne sert plus à la connexion).
 * Un seul des deux identifiants est requis : téléphone E.164 ou e-mail.
 */
export class DriverLoginDto {
  @ApiProperty({ example: '+243999000000', required: false, description: 'Numéro de téléphone format E.164' })
  @IsOptional()
  @IsString()
  @Matches(PHONE_REGEX, { message: 'Le numéro doit être au format E.164, ex: +243999000000' })
  phone?: string;

  @ApiProperty({ example: 'driver@example.com', required: false, description: 'Adresse e-mail du compte' })
  @IsOptional()
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  email?: string;

  @ApiProperty({ description: 'Mot de passe du compte' })
  @IsString()
  password!: string;

  @ApiProperty({ required: false, description: 'Identifiant unique de l’appareil' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}
