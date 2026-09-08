import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

/** Modifiable uniquement tant que la mission n'est pas démarrée (statut PLANNED/ASSIGNED). */
export class UpdateMissionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  plannedStart?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  plannedEnd?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  driverId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  vehicleId?: string;
}
