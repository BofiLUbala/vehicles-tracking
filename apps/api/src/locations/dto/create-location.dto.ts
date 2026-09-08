import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsLatitude, IsLongitude, IsOptional, IsString } from 'class-validator';
import { LocationType } from '@prisma/client';

export class CreateLocationDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: LocationType })
  @IsEnum(LocationType)
  type!: LocationType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty()
  @IsLatitude()
  latitude!: number;

  @ApiProperty()
  @IsLongitude()
  longitude!: number;

  @ApiProperty({ required: false, default: 50, description: 'Rayon autorisé en mètres' })
  @IsOptional()
  @IsInt()
  allowedRadius?: number;
}
