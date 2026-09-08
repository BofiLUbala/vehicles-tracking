import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { CreatePositionDto } from './create-position.dto';

/**
 * `POST /tracking/positions/batch` — enveloppe `{ positions: [...] }` (plutôt qu'un tableau JSON
 * nu en racine) pour rester compatible avec le `ValidationPipe` global (whitelist/transform,
 * voir main.ts), qui exige un objet en racine du body.
 */
export class BatchPositionsDto {
  @ApiProperty({ type: [CreatePositionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePositionDto)
  positions!: CreatePositionDto[];
}
