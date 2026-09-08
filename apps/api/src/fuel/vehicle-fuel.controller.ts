import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { FuelService } from './fuel.service';
import { FuelSummaryQueryDto } from './dto/fuel-summary-query.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedPrincipal } from '../common/decorators/current-user.decorator';

/** Endpoints carburant rattachés à la ressource "vehicles" (spec section 14) — module fuel, préfixe vehicles. */
@ApiTags('fuel-records')
@ApiBearerAuth()
@Controller('vehicles')
export class VehicleFuelController {
  constructor(private readonly fuel: FuelService) {}

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Get(':id/fuel-summary')
  @ApiOperation({ summary: 'Total litres/coût + consommation moyenne (L/100km) sur une période pour un véhicule' })
  fuelSummary(@CurrentUser() user: AuthenticatedPrincipal, @Param('id') id: string, @Query() query: FuelSummaryQueryDto) {
    return this.fuel.fuelSummary(user.organizationId!, id, query);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Get(':id/fuel-anomalies')
  @ApiOperation({ summary: 'Alertes FUEL_ANOMALY détectées pour ce véhicule' })
  fuelAnomalies(@CurrentUser() user: AuthenticatedPrincipal, @Param('id') id: string) {
    return this.fuel.fuelAnomalies(user.organizationId!, id);
  }
}
