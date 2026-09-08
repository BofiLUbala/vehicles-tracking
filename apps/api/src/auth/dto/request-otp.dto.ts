import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { OtpChannel } from '@prisma/client';

/** Numéro E.164 (ex : +243999000000). */
export const PHONE_REGEX = /^\+[1-9]\d{6,14}$/;

export class RequestOtpDto {
  @ApiProperty({ example: '+243999000000', description: 'Numéro de téléphone du chauffeur, format E.164' })
  @IsString()
  @Matches(PHONE_REGEX, { message: 'Le numéro doit être au format E.164, ex: +243999000000' })
  phone!: string;

  @ApiProperty({ enum: OtpChannel, required: false, default: OtpChannel.WHATSAPP })
  @IsOptional()
  @IsEnum(OtpChannel)
  channel?: OtpChannel;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deviceId?: string;
}
