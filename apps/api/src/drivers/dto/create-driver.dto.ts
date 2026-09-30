import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { DriverStatus } from '@prisma/client';
import { PHONE_REGEX } from '../../auth/dto/phone';

/**
 * Création d'un chauffeur — réservé à l'INVITATION d'un chauffeur sans compte mobile : l'e-mail est
 * obligatoire, car le lien d'activation y est envoyé. Pour un
 * chauffeur dont le compte existe déjà (créé/activé sur l'application mobile), l'admin doit passer
 * par `GET /drivers/linkable` puis `PATCH /drivers/:id` : on ne crée jamais une seconde ligne `Driver`.
 */
export class CreateDriverDto {
  @ApiProperty()
  @IsString()
  firstName!: string;

  @ApiProperty()
  @IsString()
  lastName!: string;

  @ApiProperty({ example: '+243999000000' })
  @IsString()
  @Matches(PHONE_REGEX, { message: 'Le numéro doit être au format E.164' })
  phone!: string;

  // Obligatoire à la validation HTTP (pas de @IsOptional) ; optionnel en TypeScript pour les
  // appels internes du service, qui n'envoient alors aucune invitation.
  @ApiProperty({ example: 'chauffeur@exemple.com', description: 'Reçoit le lien d’activation du compte mobile' })
  @IsEmail({}, { message: 'Une adresse e-mail valide est requise pour envoyer le lien d’activation' })
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiProperty({ enum: DriverStatus, required: false })
  @IsOptional()
  @IsEnum(DriverStatus)
  status?: DriverStatus;
}