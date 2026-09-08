import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { TrackingService } from './tracking.service';
import { CreatePositionDto } from './dto/create-position.dto';
import { BatchPositionsDto } from './dto/batch-positions.dto';
import { QueryTraceDto } from './dto/query-trace.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentDriver, CurrentUser, AuthenticatedPrincipal } from '../common/decorators/current-user.decorator';

@ApiTags('tracking')
@ApiBearerAuth()
@Controller('tracking')
export class TrackingController {
  constructor(private readonly tracking: TrackingService) {}

  @Roles(RoleName.DRIVER)
  @Post('positions')
  @ApiOperation({ summary: 'Soumettre une position GPS — chauffeur actuellement affecté au véhicule uniquement' })
  ingest(@CurrentDriver() driver: AuthenticatedPrincipal, @Body() dto: CreatePositionDto) {
    return this.tracking.ingestSingle(driver.sub, driver.organizationId!, dto);
  }

  @Roles(RoleName.DRIVER)
  @Post('positions/batch')
  @ApiOperation({ summary: "Soumettre un lot de positions GPS (synchronisation hors-ligne) — traité dans l'ordre de recordedAt" })
  ingestBatch(@CurrentDriver() driver: AuthenticatedPrincipal, @Body() dto: BatchPositionsDto) {
    return this.tracking.ingestBatch(driver.sub, driver.organizationId!, dto.positions);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Get('vehicles/live')
  @ApiOperation({ summary: "Liste des véhicules de l'organisation avec dernière position + statut calculé" })
  live(@CurrentUser() user: AuthenticatedPrincipal) {
    return this.tracking.liveVehicles(user.organizationId!);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Get('vehicles/:id/latest')
  @ApiOperation({ summary: "Dernière position connue d'un véhicule" })
  latest(@CurrentUser() user: AuthenticatedPrincipal, @Param('id') id: string) {
    return this.tracking.latestForVehicle(user.organizationId!, id);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Get('vehicles/:id/trace')
  @ApiOperation({ summary: "Trace GPS d'un véhicule (GeoJSON LineString), optionnellement filtrée par période" })
  vehicleTrace(@CurrentUser() user: AuthenticatedPrincipal, @Param('id') id: string, @Query() query: QueryTraceDto) {
    return this.tracking.vehicleTrace(user.organizationId!, id, query);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Get('missions/:id/trace')
  @ApiOperation({ summary: "Trace GPS d'une mission (GeoJSON LineString)" })
  missionTrace(@CurrentUser() user: AuthenticatedPrincipal, @Param('id') id: string) {
    return this.tracking.missionTrace(user.organizationId!, id);
  }
}
