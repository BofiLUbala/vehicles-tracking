import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { DriverStatus } from '@prisma/client';
import { PHONE_REGEX } from '../../auth/dto/request-otp.dto';

/**
 * Création d'un chauffeur — réservé à l'INVITATION d'un chauffeur sans compte mobile. Pour un
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

  @ApiProperty({ required: false, example: 'chauffeur@exemple.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
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