import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class FuelSummaryQueryDto {
  @ApiPropertyOptional({ description: 'createdAt >= from (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'createdAt <= to (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
