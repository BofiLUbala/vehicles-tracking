import { ApiProperty } from '@nestjs/swagger';
import { FuelType } from '@prisma/client';
import { IsEnum, IsLatitude, IsLongitude, IsNumber, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

/**
 * Champ "metadata" (JSON stringifié) de `POST /fuel-records` — même contrainte multipart/form-data
 * que `ValidateStepMetadataDto` (mission-steps) : deux fichiers binaires (reçu + odomètre)
 * accompagnent ce JSON, donc pas de body JSON classique.
 */
export class CreateFuelRecordMetadataDto {
  @ApiProperty({
    required: false,
    description:
      'Identifiant unique généré côté mobile — idempotence pour la synchronisation hors-ligne (comble le trou documenté dans docs/PHASE4_NOTES.md, même motif que GpsPosition/MissionStepValidation). Optionnel pour compatibilité ascendante avec un client mobile qui ne l\'enverrait pas encore.',
  })
  @IsOptional()
  @IsString()
  clientEventId?: string;

  @ApiProperty()
  @IsUUID()
  vehicleId!: string;

  @ApiProperty({ description: 'Litres pleins' })
  @IsNumber()
  @IsPositive()
  liters!: number;

  @ApiProperty({ description: 'Coût total (devise locale)' })
  @IsNumber()
  @IsPositive()
  totalCost!: number;

  @ApiProperty({ description: 'Kilométrage affiché au compteur au moment du plein' })
  @IsNumber()
  @IsPositive()
  odometer!: number;

  @ApiProperty({ enum: FuelType })
  @IsEnum(FuelType)
  fuelType!: FuelType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  stationName?: string;

  @ApiProperty({ required: false, description: 'Position GPS du plein — utilisée pour le contrôle "station autorisée à proximité"' })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsLongitude()
  longitude?: number;
}
