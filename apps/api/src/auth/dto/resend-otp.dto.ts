import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';
import { PHONE_REGEX } from './request-otp.dto';

export class ResendOtpDto {
  @ApiProperty({ example: '+243999000000' })
  @IsString()
  @Matches(PHONE_REGEX, { message: 'Le numéro doit être au format E.164' })
  phone!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deviceId?: string;
}
