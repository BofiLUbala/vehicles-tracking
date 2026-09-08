import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsISO8601, IsLatitude, IsLongitude, IsNumber, IsOptional, IsUUID } from 'class-validator';

/**
 * Payload d'une position GPS unique — champs EXACTEMENT ceux du cahier des charges (section 11),
 * partagés tels quels avec l'application chauffeur. Ne pas renommer.
 */
export class CreatePositionDto {
  @ApiProperty({ description: "Identifiant client (UUID) pour l'idempotence côté synchronisation hors-ligne" })
  @IsUUID()
  clientEventId!: string;

  @ApiProperty()
  @IsUUID()
  vehicleId!: string;

  @ApiProperty({ required: false, description: 'Mission en cours (optionnel — position hors mission possible)' })
  @IsOptional()
  @IsUUID()
  missionId?: string;

  @ApiProperty()
  @IsLatitude()
  latitude!: number;

  @ApiProperty()
  @IsLongitude()
  longitude!: number;

  @ApiProperty({ required: false, description: 'Précision GPS en mètres' })
  @IsOptional()
  @IsNumber()
  accuracy?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  altitude?: number;

  @ApiProperty({ required: false, description: 'Vitesse en km/h' })
  @IsOptional()
  @IsNumber()
  speed?: number;

  @ApiProperty({ required: false, description: 'Cap en degrés (0-360)' })
  @IsOptional()
  @IsNumber()
  heading?: number;

  @ApiProperty({ description: 'Le device a détecté une position simulée (mock location)' })
  @IsBoolean()
  isMocked!: boolean;

  @ApiProperty({ description: 'Horodatage client (ISO 8601)' })
  @IsISO8601()
  recordedAt!: string;
}
