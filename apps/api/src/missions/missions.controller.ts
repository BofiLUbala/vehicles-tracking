import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { MissionsService } from './missions.service';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateMissionDto } from './dto/update-mission.dto';
import { AssignMissionDto } from './dto/assign-mission.dto';
import { CancelMissionDto } from './dto/cancel-mission.dto';
import { QueryMissionsDto } from './dto/query-missions.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentDriver, AuthenticatedPrincipal } from '../common/decorators/current-user.decorator';

@ApiTags('missions')
@ApiBearerAuth()
@Controller('missions')
export class MissionsController {
  constructor(private readonly missions: MissionsService) {}

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Post()
  @ApiOperation({ summary: 'Créer une mission avec ses étapes ordonnées' })
  create(@CurrentUser() user: AuthenticatedPrincipal, @Body() dto: CreateMissionDto) {
    return this.missions.create(user.organizationId!, dto);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Get()
  @ApiOperation({ summary: 'Lister les missions (filtrable par statut/chauffeur/véhicule/plage de dates)' })
  findAll(@CurrentUser() user: AuthenticatedPrincipal, @Query() query: QueryMissionsDto) {
    return this.missions.findAll(user.organizationId!, query);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Get(':id')
  @ApiOperation({ summary: "Détail d'une mission (étapes + événements)" })
  findOne(@CurrentUser() user: AuthenticatedPrincipal, @Param('id') id: string) {
    return this.missions.findOne(user.organizationId!, id);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour une mission tant que non démarrée' })
  update(@CurrentUser() user: AuthenticatedPrincipal, @Param('id') id: string, @Body() dto: UpdateMissionDto) {
    return this.missions.update(user.organizationId!, id, dto);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Post(':id/assign')
  @ApiOperation({ summary: 'Affecter chauffeur + véhicule à une mission' })
  assign(@CurrentUser() user: AuthenticatedPrincipal, @Param('id') id: string, @Body() dto: AssignMissionDto) {
    return this.missions.assign(user.organizationId!, id, dto);
  }

  @Roles(RoleName.DRIVER)
  @Post(':id/start')
  @ApiOperation({ summary: 'Démarrer une mission (chauffeur affecté uniquement)' })
  start(@CurrentDriver() driver: AuthenticatedPrincipal, @Param('id') id: string) {
    return this.missions.start(driver.sub, id);
  }

  @Roles(RoleName.DRIVER, RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Post(':id/complete')
  @ApiOperation({ summary: 'Terminer une mission (chauffeur affecté, ou admin en override)' })
  complete(@CurrentUser() user: AuthenticatedPrincipal, @Param('id') id: string) {
    return this.missions.complete({ sub: user.sub, type: user.type }, id);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Post(':id/cancel')
  @ApiOperation({ summary: 'Annuler une mission (journalisé en AuditLog)' })
  cancel(@CurrentUser() user: AuthenticatedPrincipal, @Param('id') id: string, @Body() dto: CancelMissionDto) {
    return this.missions.cancel(user.organizationId!, id, dto.reason, user.sub);
  }
}
