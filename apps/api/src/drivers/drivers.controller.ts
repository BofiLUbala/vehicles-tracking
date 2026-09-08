import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { AssignVehicleDto, RevokeDeviceDto } from './dto/assign-vehicle.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedPrincipal } from '../common/decorators/current-user.decorator';

@ApiTags('drivers')
@ApiBearerAuth()
@Controller('drivers')
export class DriversController {
  constructor(private readonly drivers: DriversService) {}

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Post()
  @ApiOperation({ summary: 'Créer un chauffeur' })
  create(@CurrentUser() user: AuthenticatedPrincipal, @Body() dto: CreateDriverDto) {
    return this.drivers.create(user.organizationId!, dto);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Get()
  @ApiOperation({ summary: 'Lister les chauffeurs' })
  findAll(@CurrentUser() user: AuthenticatedPrincipal) {
    return this.drivers.findAll(user.organizationId!);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un chauffeur' })
  findOne(@CurrentUser() user: AuthenticatedPrincipal, @Param('id') id: string) {
    return this.drivers.findOne(user.organizationId!, id);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour un chauffeur' })
  update(@CurrentUser() user: AuthenticatedPrincipal, @Param('id') id: string, @Body() dto: UpdateDriverDto) {
    return this.drivers.update(user.organizationId!, id, dto);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Désactiver (soft-delete) un chauffeur' })
  remove(@CurrentUser() user: AuthenticatedPrincipal, @Param('id') id: string) {
    return this.drivers.remove(user.organizationId!, id);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Post(':id/assign-vehicle')
  @ApiOperation({ summary: 'Affecter un véhicule au chauffeur' })
  assignVehicle(@CurrentUser() user: AuthenticatedPrincipal, @Param('id') id: string, @Body() dto: AssignVehicleDto) {
    return this.drivers.assignVehicle(user.organizationId!, id, dto.vehicleId);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Post(':id/revoke-device')
  @ApiOperation({ summary: "Révoquer l'appareil associé au chauffeur" })
  revokeDevice(@CurrentUser() user: AuthenticatedPrincipal, @Param('id') id: string, @Body() dto: RevokeDeviceDto) {
    return this.drivers.revokeDevice(user.organizationId!, id, dto.deviceId);
  }
}
