import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { AlertsService } from './alerts.service';
import { QueryAlertsDto } from './dto/query-alerts.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedPrincipal } from '../common/decorators/current-user.decorator';

@ApiTags('alerts')
@ApiBearerAuth()
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Get()
  @ApiOperation({ summary: "Liste des alertes de l'organisation, filtrable par type/niveau/statut/véhicule/chauffeur/mission/période" })
  findAll(@CurrentUser() user: AuthenticatedPrincipal, @Query() query: QueryAlertsDto) {
    return this.alerts.findAll(user.organizationId!, query);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Get(':id')
  @ApiOperation({ summary: "Détail d'une alerte (score explicable inclus)" })
  findOne(@CurrentUser() user: AuthenticatedPrincipal, @Param('id') id: string) {
    return this.alerts.findOne(user.organizationId!, id);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: "Transition de statut d'une alerte (NEW -> ACKNOWLEDGED -> RESOLVED, ou -> DISMISSED) — journalisée" })
  updateStatus(@CurrentUser() user: AuthenticatedPrincipal, @Param('id') id: string, @Body() dto: UpdateAlertDto) {
    return this.alerts.updateStatus(user.organizationId!, user.sub, id, dto.status);
  }
}
