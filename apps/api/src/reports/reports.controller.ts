import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { ReportsService, ExportResult } from './reports.service';
import { QueryMissionReportDto } from './dto/query-mission-report.dto';
import { QueryFuelReportDto } from './dto/query-fuel-report.dto';
import { QueryGpsReportDto } from './dto/query-gps-report.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedPrincipal } from '../common/decorators/current-user.decorator';

/**
 * `src/reports/` — recherche + export (section 20). Org-scopé, ADMIN/SUPER_ADMIN uniquement (mêmes
 * rôles que `alerts`/`fuel-records` en lecture). `format=json` (défaut) renvoie un tableau JSON
 * classique consommable directement par le dashboard admin ; `csv`/`xlsx`/`pdf` renvoient un fichier
 * téléchargeable (`Content-Disposition: attachment`). Voir docs/PHASE5_NOTES.md pour le contrat
 * complet et les filtres volontairement absents (zone — aucune donnée de zone n'existe encore).
 */
@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Get('missions')
  @ApiProduces('application/json', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/pdf')
  @ApiOperation({ summary: 'Rapport des missions, filtrable par période/véhicule/chauffeur/statut/point de collecte — export json|csv|xlsx|pdf' })
  async missions(@CurrentUser() user: AuthenticatedPrincipal, @Query() query: QueryMissionReportDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.reports.missionsReport(user.organizationId!, query);
    return this.send(res, result);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Get('fuel')
  @ApiProduces('application/json', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/pdf')
  @ApiOperation({ summary: 'Rapport carburant (consommation), filtrable par période/véhicule/chauffeur — export json|csv|xlsx|pdf' })
  async fuel(@CurrentUser() user: AuthenticatedPrincipal, @Query() query: QueryFuelReportDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.reports.fuelReport(user.organizationId!, query);
    return this.send(res, result);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Get('gps-positions')
  @ApiProduces('application/json', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/pdf')
  @ApiOperation({ summary: 'Rapport positions GPS brutes, filtrable par période/véhicule/mission — export json|csv|xlsx|pdf (plafonné, voir docs)' })
  async gpsPositions(@CurrentUser() user: AuthenticatedPrincipal, @Query() query: QueryGpsReportDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.reports.gpsPositionsReport(user.organizationId!, query);
    return this.send(res, result);
  }

  /**
   * `format=json` renvoie une enveloppe `{ data, meta }` : `meta.truncated` indique explicitement
   * qu'il reste des lignes au-delà de celles renvoyées — auparavant un rapport plafonné était
   * indiscernable d'un rapport complet. Les formats fichier (csv/xlsx/pdf) ne peuvent pas porter
   * cette enveloppe : la même information part alors dans les en-têtes `X-Report-*`, également
   * présents sur la réponse JSON.
   */
  private send(res: Response, result: ExportResult) {
    res.set({
      'X-Report-Limit': String(result.meta.limit),
      'X-Report-Offset': String(result.meta.offset),
      'X-Report-Returned': String(result.meta.returned),
      'X-Report-Has-More': String(result.meta.hasMore),
      'X-Report-Max-Rows': String(result.meta.maxRows),
    });

    if (Array.isArray(result.body)) {
      res.set('Content-Type', result.contentType);
      return { data: result.body, meta: result.meta };
    }
    res.set({
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
    });
    res.send(result.body);
    return undefined;
  }
}
