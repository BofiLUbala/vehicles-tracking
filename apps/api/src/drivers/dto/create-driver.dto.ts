import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { DriverStatus } from '@prisma/client';
import { PHONE_REGEX } from '../../auth/dto/request-otp.dto';

export class CreateDriverDto {
  @ApiProperty()
  @IsString()
  firstName!: string;

  @ApiProperty()
  @IsString()
  lastName!: string;

  @ApiProperty({ example: '+243999000000' })
  @IsString()
  @Matches(PHONE_REGEX, { message: 'Le numéro doit être au format E.164' })
  phone!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiProperty({ enum: DriverStatus, required: false })
  @IsOptional()
  @IsEnum(DriverStatus)
  status?: DriverStatus;
}
