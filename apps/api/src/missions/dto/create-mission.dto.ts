import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { MissionStepActionType } from '@prisma/client';

export class MissionStepInputDto {
  @ApiProperty({ description: 'Identifiant du lieu (Location) de cette étape' })
  @IsUUID()
  locationId!: string;

  @ApiProperty({ description: "Ordre de passage (1-based), doit être unique dans la mission" })
  @IsInt()
  @Min(1)
  order!: number;

  @ApiProperty({ enum: MissionStepActionType })
  @IsEnum(MissionStepActionType)
  actionType!: MissionStepActionType;

  @ApiProperty({ required: false, description: 'Heure planifiée de passage (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  plannedAt?: string;

  @ApiProperty({ required: false, default: 15, description: 'Tolérance en minutes autour de plannedAt' })
  @IsOptional()
  @IsInt()
  @Min(1)
  toleranceMin?: number;
}

export class CreateMissionDto {
  @ApiProperty({ description: 'Chauffeur affecté (le schéma exige un chauffeur+véhicule dès la création — voir docs/PHASE2_NOTES.md)' })
  @IsUUID()
  driverId!: string;

  @ApiProperty({ description: 'Véhicule affecté' })
  @IsUUID()
  vehicleId!: string;

  @ApiProperty({ required: false, description: 'Début planifié (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  plannedStart?: string;

  @ApiProperty({ required: false, description: 'Fin planifiée (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  plannedEnd?: string;

  @ApiProperty({ type: [MissionStepInputDto], description: 'Liste ordonnée des étapes' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MissionStepInputDto)
  steps!: MissionStepInputDto[];
}
