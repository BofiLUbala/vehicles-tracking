import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';

export class QueryTraceDto {
  @ApiProperty({ required: false, description: 'Borne inférieure (ISO 8601) — recordedAt >= from' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiProperty({ required: false, description: 'Borne supérieure (ISO 8601) — recordedAt <= to' })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
