import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsISO8601, IsLatitude, IsLongitude, IsNumber, IsString, IsUUID, Min } from 'class-validator';

/**
 * Métadonnées de validation d'étape — transmises en tant que champ JSON (stringifié) d'une requête
 * multipart/form-data, aux côtés du fichier "photo" (voir MissionStepsController.validate).
 */
export class ValidateStepMetadataDto {
  @ApiProperty({ description: "Identifiant client (UUID) pour l'idempotence côté synchronisation hors-ligne" })
  @IsUUID()
  clientEventId!: string;

  @ApiProperty({ description: 'Jeton QR signé scanné par le chauffeur sur le lieu' })
  @IsString()
  qrToken!: string;

  @ApiProperty()
  @IsLatitude()
  latitude!: number;

  @ApiProperty()
  @IsLongitude()
  longitude!: number;

  @ApiProperty({ description: 'Précision GPS en mètres' })
  @IsNumber()
  @Min(0)
  accuracy!: number;

  @ApiProperty({ description: 'Le device a détecté une position simulée (mock location)' })
  @IsBoolean()
  isMocked!: boolean;

  @ApiProperty({ description: 'Horodatage client (ISO 8601) — la fenêtre de tolérance est vérifiée contre l\'horloge serveur, pas cette valeur' })
  @IsISO8601()
  recordedAt!: string;
}
