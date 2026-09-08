import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { AssignDriverDto } from './dto/assign-driver.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedPrincipal } from '../common/decorators/current-user.decorator';

@ApiTags('vehicles')
@ApiBearerAuth()
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Post()
  @ApiOperation({ summary: 'Créer un véhicule' })
  create(@CurrentUser() user: AuthenticatedPrincipal, @Body() dto: CreateVehicleDto) {
    return this.vehicles.create(user.organizationId!, dto);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Get()
  @ApiOperation({ summary: 'Lister les véhicules' })
  findAll(@CurrentUser() user: AuthenticatedPrincipal) {
    return this.vehicles.findAll(user.organizationId!);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Get(':id')
  @ApiOperation({ summary: "Détail d'un véhicule" })
  findOne(@CurrentUser() user: AuthenticatedPrincipal, @Param('id') id: string) {
    return this.vehicles.findOne(user.organizationId!, id);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Get(':id/history')
  @ApiOperation({ summary: "Historique des affectations chauffeur du véhicule" })
  history(@CurrentUser() user: AuthenticatedPrincipal, @Param('id') id: string) {
    return this.vehicles.history(user.organizationId!, id);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour un véhicule' })
  update(@CurrentUser() user: AuthenticatedPrincipal, @Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    return this.vehicles.update(user.organizationId!, id, dto);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Désactiver (soft-delete) un véhicule' })
  remove(@CurrentUser() user: AuthenticatedPrincipal, @Param('id') id: string) {
    return this.vehicles.remove(user.organizationId!, id);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Post(':id/assign-driver')
  @ApiOperation({ summary: 'Affecter un chauffeur au véhicule' })
  assignDriver(@CurrentUser() user: AuthenticatedPrincipal, @Param('id') id: string, @Body() dto: AssignDriverDto) {
    return this.vehicles.assignDriver(user.organizationId!, id, dto.driverId);
  }
}
