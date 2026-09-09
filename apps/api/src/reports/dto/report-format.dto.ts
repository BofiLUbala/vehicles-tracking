import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export const REPORT_FORMATS = ['json', 'csv', 'xlsx', 'pdf'] as const;
export type ReportFormatValue = (typeof REPORT_FORMATS)[number];

/** Mixin de champ partagé par tous les DTO de requête de `src/reports/` — hérité, pas dupliqué. */
export class ReportFormatDto {
  @ApiPropertyOptional({ enum: REPORT_FORMATS, default: 'json' })
  @IsOptional()
  @IsIn(REPORT_FORMATS)
  format?: ReportFormatValue;
}
