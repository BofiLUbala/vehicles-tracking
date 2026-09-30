import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { OtpChannel } from '@prisma/client';

/**
 * Mot de passe oublié d'un compte ADMIN : code OTP envoyé par e-mail, puis nouveau mot de passe.
 * Les chauffeurs ne reçoivent pas de code : voir `RequestDriverPasswordResetDto` (lien par e-mail).
 */
export class RequestPasswordResetDto {
  @ApiProperty({ enum: [OtpChannel.EMAIL], required: false, default: OtpChannel.EMAIL, description: 'Canal de récupération (e-mail uniquement)' })
  @IsOptional()
  @Equals(OtpChannel.EMAIL, { message: 'La récupération se fait uniquement par e-mail' })
  channel?: OtpChannel;

  @ApiProperty({ example: 'admin@example.com', description: 'Adresse e-mail du compte admin' })
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  email!: string;
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
