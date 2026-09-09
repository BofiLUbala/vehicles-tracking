import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { MissionStatus } from '@prisma/client';
import { ReportFormatDto } from './report-format.dto';

/**
 * `GET /reports/missions` — filtres section 20 (période, véhicule, chauffeur, statut, point de
 * collecte). Pas de filtre "zone" (aucune table de polygone de zone n'existe encore — voir
 * docs/PHASE4_NOTES.md "Follow-ups Phase 5" et docs/PHASE5_NOTES.md). Pas de filtre "mission"
 * dédié (un `GET /missions/:id` suffit pour une mission unique ; ce rapport liste/filtre en masse).
 */
export class QueryMissionReportDto extends ReportFormatDto {
  @ApiPropertyOptional({ description: 'plannedStart >= from (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'plannedStart <= to (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  driverId?: string;

  @ApiPropertyOptional({ enum: MissionStatus })
  @IsOptional()
  @IsEnum(MissionStatus)
  status?: MissionStatus;

  @ApiPropertyOptional({ description: "Point de collecte (Location) — missions ayant au moins une étape à ce lieu" })
  @IsOptional()
  @IsUUID()
  locationId?: string;
}
