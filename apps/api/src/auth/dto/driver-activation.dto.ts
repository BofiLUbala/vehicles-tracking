import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

/** Jeton reçu dans un lien envoyé par e-mail au chauffeur (invitation ou réinitialisation). */
export class DriverInvitationLookupDto {
  @ApiProperty({ description: 'Jeton du lien d’activation' })
  @IsString()
  @MinLength(16)
  token!: string;
}

/** Activation du compte chauffeur depuis le lien d'invitation : le chauffeur choisit son mot de passe. */
export class ActivateDriverDto extends DriverInvitationLookupDto {
  @ApiProperty({ description: 'Mot de passe choisi (8 caractères minimum)' })
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  password!: string;

  @ApiProperty({ required: false, description: 'Identifiant unique de l’appareil' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

/** Mot de passe oublié (chauffeur) : un lien de réinitialisation est envoyé à cette adresse. */
export class RequestDriverPasswordResetDto {
  @ApiProperty({ example: 'chauffeur@exemple.com' })
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  email!: string;
}

/** Nouveau mot de passe choisi depuis le lien de réinitialisation reçu par e-mail. */
export class ConfirmDriverPasswordResetDto extends DriverInvitationLookupDto {
  @ApiProperty({ description: 'Nouveau mot de passe (8 caractères minimum)' })
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  newPassword!: string;
}
