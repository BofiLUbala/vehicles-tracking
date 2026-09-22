import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { MissionGeoService } from './mission-geo.service';
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

  @Roles(RoleName.DRIVER)
  @Get('mobile/missions/:id/planned-route')
  @ApiOperation({ summary: "Itinéraire planifié d'une mission du chauffeur connecté" })
  driverPlannedRoute(@CurrentDriver() driver: AuthenticatedPrincipal, @Param('id') id: string) {
    return this.geo.plannedRouteForDriver(driver.sub, id);
  }
}
