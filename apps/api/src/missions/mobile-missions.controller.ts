import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { MissionsService } from './missions.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentDriver, AuthenticatedPrincipal } from '../common/decorators/current-user.decorator';

/**
 * Endpoints application chauffeur (mobile). Distincts des endpoints admin `/missions` :
 * scoping automatique par chauffeur appelant (le JWT fait foi, jamais un paramètre client).
 */
@ApiTags('mobile-missions')
@ApiBearerAuth()
@Controller('mobile/missions')
export class MobileMissionsController {
  constructor(private readonly missions: MissionsService) {}

  @Roles(RoleName.DRIVER)
  @Get('today')
  @ApiOperation({ summary: "Missions du jour pour le chauffeur connecté (fenêtre [00:00,24:00) UTC)" })
  today(@CurrentDriver() driver: AuthenticatedPrincipal) {
    return this.missions.todayForDriver(driver.sub);
  }

  @Roles(RoleName.DRIVER)
  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'une mission du chauffeur connecté (403 si non affectée)' })
  findOne(@CurrentDriver() driver: AuthenticatedPrincipal, @Param('id') id: string) {
    return this.missions.findOneForDriver(driver.sub, id);
  }
}
