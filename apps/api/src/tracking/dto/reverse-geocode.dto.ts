import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsLatitude, IsLongitude } from 'class-validator';

export class ReverseGeocodeQueryDto {
  @ApiProperty({ example: -4.325 })
  @Type(() => Number)
  @IsLatitude()
  lat!: number;

  @ApiProperty({ example: 15.322 })
  @Type(() => Number)
  @IsLongitude()
  lng!: number;
}
