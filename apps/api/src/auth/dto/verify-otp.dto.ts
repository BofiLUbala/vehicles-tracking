import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';
import { PHONE_REGEX } from './request-otp.dto';

export class VerifyOtpDto {
  @ApiProperty({ example: '+243999000000' })
  @IsString()
  @Matches(PHONE_REGEX, { message: 'Le numéro doit être au format E.164' })
  phone!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Le code doit contenir 6 chiffres' })
  code!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deviceId?: string;
}
