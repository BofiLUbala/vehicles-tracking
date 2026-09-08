import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CancelMissionDto {
  @ApiProperty({ description: 'Raison de l\'annulation (journalisée dans MissionEvent + AuditLog)' })
  @IsString()
  @MinLength(3)
  reason!: string;
}
