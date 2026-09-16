import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { ZonesService } from './zones.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedPrincipal } from '../common/decorators/current-user.decorator';

/**
 * `src/zones/` — zones de géofencing (section 15 : « chauffeur hors zone », +30 points).
 * Org-scopé, réservé aux administrateurs comme les autres référentiels.
 */
@ApiTags('zones')
@ApiBearerAuth()
@Controller('zones')
export class ZonesController {
  constructor(private readonly zones: ZonesService) {}

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Post()
  @ApiOperation({ summary: 'Créer une zone (polygone GeoJSON)' })
  create(@CurrentUser() user: AuthenticatedPrincipal, @Body() dto: CreateZoneDto) {
    return this.zones.create(user.organizationId!, dto);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Get()
  @ApiOperation({ summary: 'Lister les zones' })
  findAll(@CurrentUser() user: AuthenticatedPrincipal) {
    return this.zones.findAll(user.organizationId!);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Get(':id')
  @ApiOperation({ summary: 'Détail d’une zone' })
  findOne(@CurrentUser() user: AuthenticatedPrincipal, @Param('id') id: string) {
    return this.zones.findOne(user.organizationId!, id);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Modifier une zone (nom, nature, polygone, activation)' })
  update(@CurrentUser() user: AuthenticatedPrincipal, @Param('id') id: string, @Body() dto: UpdateZoneDto) {
    return this.zones.update(user.organizationId!, id, dto);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une zone (suppression logique)' })
  remove(@CurrentUser() user: AuthenticatedPrincipal, @Param('id') id: string) {
    return this.zones.remove(user.organizationId!, id);
  }
}
