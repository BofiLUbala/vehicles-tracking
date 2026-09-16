import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export const REPORT_FORMATS = ['json', 'csv', 'xlsx', 'pdf'] as const;
export type ReportFormatValue = (typeof REPORT_FORMATS)[number];

/** Mixin de champ partagé par tous les DTO de requête de `src/reports/` — hérité, pas dupliqué. */
export class ReportFormatDto {
  @ApiPropertyOptional({ enum: REPORT_FORMATS, default: 'json' })
  @IsOptional()
  @IsIn(REPORT_FORMATS)
  format?: ReportFormatValue;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 5000,
    default: 1000,
    description: 'Nombre maximum de lignes renvoyees (plafonne a 5000).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  limit?: number;

  @ApiPropertyOptional({
    minimum: 0,
    default: 0,
    description: 'Nombre de lignes ignorees avant celles renvoyees (pagination).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
