import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';
import { ReportFormatDto } from './report-format.dto';

/** `GET /reports/fuel` — filtres section 20 (période, véhicule, chauffeur). Le filtre "consommation"
 * de la section 20 EST ce rapport (il expose litres/coût/odomètre par ligne, dont la consommation
 * dérivée figure déjà dans `GET /vehicles/:id/fuel-summary` — pas dupliqué ici, voir PHASE5_NOTES.md). */
export class QueryFuelReportDto extends ReportFormatDto {
  @ApiPropertyOptional({ description: 'createdAt >= from (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'createdAt <= to (ISO 8601)' })
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
}
