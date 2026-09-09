import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';
import { ReportFormatDto } from './report-format.dto';

/** `GET /reports/gps-positions` — filtres section 20 (période, véhicule, mission). Export brut des
 * positions GPS — potentiellement volumineux, voir garde-fou `REPORT_MAX_ROWS` dans reports.service.ts. */
export class QueryGpsReportDto extends ReportFormatDto {
  @ApiPropertyOptional({ description: 'recordedAt >= from (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'recordedAt <= to (ISO 8601)' })
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
  missionId?: string;
}
