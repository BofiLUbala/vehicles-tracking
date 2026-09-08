import { ApiProperty } from '@nestjs/swagger';
import { AlertStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateAlertDto {
  @ApiProperty({ enum: AlertStatus })
  @IsEnum(AlertStatus)
  status!: AlertStatus;
}
