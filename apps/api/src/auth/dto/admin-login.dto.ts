import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class AdminLoginDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ required: false, description: 'Identifiant stable de l\'appareil, utilisé pour la détection nouvel appareil' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}
