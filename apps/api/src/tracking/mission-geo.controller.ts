import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { MissionGeoService } from './mission-geo.service';
import { ReverseGeocodeQueryDto } from './dto/reverse-geocode.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentDriver, CurrentUser, AuthenticatedPrincipal } from '../common/decorators/current-user.decorator';

@ApiTags('tracking')
@ApiBearerAuth()
@Controller()
export class MissionGeoController {
  constructor(private readonly geo: MissionGeoService) {}

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Get('tracking/missions/:id/planned-route')
  @ApiOperation({ summary: 'Itinéraire planifié (TomTom Routing) entre les étapes — dérivé, distinct de la trace GPS réelle' })
  plannedRoute(@CurrentUser() user: AuthenticatedPrincipal, @Param('id') id: string) {
    return this.geo.plannedRouteForOrganization(user.organizationId!, id);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Get('tracking/missions/:id/trace/snapped')
  @ApiOperation({ summary: 'Trace GPS recalée sur les routes (TomTom Snap to Roads) — dérivée, les positions brutes sont conservées' })
  snappedTrace(@CurrentUser() user: AuthenticatedPrincipal, @Param('id') id: string) {
    return this.geo.snappedTraceForOrganization(user.organizationId!, id);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Get('tracking/vehicles/:id/trace/snapped')
  @ApiOperation({
    summary: 'Trace d’un véhicule (mission en cours ou 12 dernières heures) recalée sur les routes réelles — repli sur le GPS brut si TomTom est indisponible',
  })
  snappedVehicleTrace(@CurrentUser() user: AuthenticatedPrincipal, @Param('id') id: string) {
    return this.geo.snappedVehicleTraceForOrganization(user.organizationId!, id);
  }

  @Roles(RoleName.DRIVER)
  @Get('mobile/missions/:id/planned-route')
  @ApiOperation({ summary: "Itinéraire planifié d'une mission du chauffeur connecté" })
  driverPlannedRoute(@CurrentDriver() driver: AuthenticatedPrincipal, @Param('id') id: string) {
    return this.geo.plannedRouteForDriver(driver.sub, id);
  }

  @Roles(RoleName.DRIVER)
  @Get('mobile/missions/:id/trace/snapped')
  @ApiOperation({ summary: "Trace recalée sur les routes (TomTom Snap to Roads) d'une mission du chauffeur connecté" })
  driverSnappedTrace(@CurrentDriver() driver: AuthenticatedPrincipal, @Param('id') id: string) {
    return this.geo.snappedTraceForDriver(driver.sub, id);
  }

  @Roles(RoleName.DRIVER)
  @Get('mobile/geocode/reverse')
  @ApiOperation({ summary: "Adresse d'un point (arrêts détectés sur une trace) — TomTom Reverse Geocoding, mis en cache" })
  reverseGeocode(@Query() query: ReverseGeocodeQueryDto) {
    return this.geo.reverseGeocode(query.lat, query.lng);
  }
}
