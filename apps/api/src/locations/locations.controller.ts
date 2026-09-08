import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { LocationsService } from './locations.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedPrincipal } from '../common/decorators/current-user.decorator';

@ApiTags('locations')
@ApiBearerAuth()
@Controller('locations')
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Post()
  @ApiOperation({ summary: 'Créer un point (collecte/dépôt/décharge/...)' })
  create(@CurrentUser() user: AuthenticatedPrincipal, @Body() dto: CreateLocationDto) {
    return this.locations.create(user.organizationId!, dto);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Get()
  @ApiOperation({ summary: 'Lister les points' })
  findAll(@CurrentUser() user: AuthenticatedPrincipal) {
    return this.locations.findAll(user.organizationId!);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Get(':id')
  @ApiOperation({ summary: "Détail d'un point" })
  findOne(@CurrentUser() user: AuthenticatedPrincipal, @Param('id') id: string) {
    return this.locations.findOne(user.organizationId!, id);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour un point' })
  update(@CurrentUser() user: AuthenticatedPrincipal, @Param('id') id: string, @Body() dto: UpdateLocationDto) {
    return this.locations.update(user.organizationId!, id, dto);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Désactiver (soft-delete) un point' })
  remove(@CurrentUser() user: AuthenticatedPrincipal, @Param('id') id: string) {
    return this.locations.remove(user.organizationId!, id);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Post(':id/generate-qr')
  @ApiOperation({ summary: 'Générer un QR code signé (jeton opaque) pour ce point' })
  generateQr(@CurrentUser() user: AuthenticatedPrincipal, @Param('id') id: string) {
    return this.locations.generateQr(user.organizationId!, id);
  }
}
