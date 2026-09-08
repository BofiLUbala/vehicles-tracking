import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class AssignVehicleDto {
  @ApiProperty()
  @IsUUID()
  vehicleId!: string;
}

export class RevokeDeviceDto {
  @ApiProperty()
  @IsString()
  deviceId!: string;
}
